import { decodePasteBytes, stripAnsiSequences } from "@opentui/core";
import { useKeyboard, usePaste, useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { TextField } from "../components/ui/TextField";
import { saveConfig } from "../lib/config";
import { classifyTursoError, clearTursoConfig, normalizeUrl, setTursoConfig } from "../lib/turso";
import { validateDbUrl, validateProfileEmail, validateProfileName } from "../lib/validate";
import type { ApplySchemaResult } from "../repos/types";
import { useSession } from "../store/session";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import type { ConnectStage, SetupScreenProps, SetupStep } from "./SetupScreen.types";

// First-run Setup (M1 + W1): connect form, three-stage connecting state,
// inline failure, and profile. Credentials are validated with a real SELECT 1,
// schema is applied idempotently, and the profile lives in remote
// app_settings. On success the config file is persisted and onboarding is
// marked complete.
//
// Focus model: one of url/token/connect (step 1) or name/email/start
// (profile) owns the keyboard, synced into `ui.focusedField` so the global
// App handler defers instead of hijacking typing. Step 1 opens with Connect
// focused: `d` demos immediately (G1), Enter attempts Connect, and typing a
// printable character jumps into the URL field with that character (so the
// primary path still types instantly). Tab cycles all three stops.
const FOCUS_URL = "setup-url";
const FOCUS_TOKEN = "setup-token";
const FOCUS_CONNECT = "setup-connect";
const FOCUS_NAME = "setup-name";
const FOCUS_EMAIL = "setup-email";
const FOCUS_START = "setup-start";

const CONNECT_ORDER = [FOCUS_URL, FOCUS_TOKEN, FOCUS_CONNECT];
const PROFILE_ORDER = [FOCUS_NAME, FOCUS_EMAIL, FOCUS_START];

function cycleFocus(order: string[], current: string | null, delta: 1 | -1): string {
  const index = order.indexOf(current ?? "");
  const next = index === -1 ? 0 : (index + delta + order.length) % order.length;
  return order[next];
}

function initialStages(): ConnectStage[] {
  return [
    { label: "SELECT 1", state: "active" },
    { label: "applying schema", state: "pending" },
    { label: "loading profile", state: "pending" },
  ];
}

function truncate(value: string, room: number): string {
  if (value.length <= room) {
    return value;
  }
  return `${value.slice(0, Math.max(0, room - 3))}...`;
}

// Secure fields render no `<input>`, so Setup owns their paste too: fold a
// pasted blob to a single line of printable characters, dropping C0 controls
// (newlines, tab, ESC) and DEL/C1 controls (U+007F-U+009F), before appending.
function sanitizePastedToken(text: string): string {
  let out = "";
  for (const char of text) {
    if (char >= " " && !(char >= "\u007f" && char <= "\u009f")) {
      out += char;
    }
  }
  return out;
}

function schemaDetail(schema: ApplySchemaResult): string {
  const ensured = schema.ensured ?? schema.applied;
  if (schema.applied < ensured) {
    return `${schema.applied} applied, ${ensured} ensured`;
  }
  return `${schema.applied} applied`;
}

export function SetupScreen(props: SetupScreenProps): ReactNode {
  const { theme, color } = useTheme();
  const tokens = theme.tokens;
  const { width } = useTerminalDimensions();
  const repoMode = useSession((state) => state.repoMode);
  const focusedField = useUi((state) => state.focusedField);

  const [step, setStep] = useState<SetupStep>("connect");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [stages, setStages] = useState<ConnectStage[]>(initialStages);
  const [failureError, setFailureError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [failureFocus, setFailureFocus] = useState<string>(FOCUS_URL);
  const runRef = useRef(0);

  // Entry focus: Connect (see the focus-model note above). The cleanup
  // invalidates any in-flight connect/save so a late mock resolve cannot
  // finish the flow after Setup is gone (navigation, `d`, or quit), then
  // releases focus; dismissSetup/showSetupScreen also clear ui.focusedField.
  useEffect(() => {
    useUi.getState().setFocusedField(FOCUS_CONNECT);
    return () => {
      runRef.current += 1;
      useUi.getState().setFocusedField(null);
    };
  }, []);

  const narrow = width < 70;
  // Layout pads the content column by 1 on each side, so the usable width is
  // `width - 2` minus the sidebar rail when it is shown. Clamp to that so a
  // very narrow terminal shrinks the form instead of clipping it, with a
  // readable floor that can never go zero or negative.
  const availableWidth = Math.max(8, width - 2);
  const formWidth = narrow ? Math.max(8, Math.min(availableWidth, width - 4)) : 52;
  const canSubmit = url.trim() !== "" && token.trim() !== "";

  async function finishToApp(profileName: string): Promise<void> {
    // Persist credentials only for a real Turso connection. Mock mode is a
    // dev-only preview and must not write fake credentials to disk.
    if (repoMode === "turso") {
      const normalizedUrl = normalizeUrl(url.trim());
      await saveConfig({ url: normalizedUrl, token });
      setTursoConfig({ url: normalizedUrl, token });
    }
    const session = useSession.getState();
    session.setConfigComplete(true);
    session.setProfileName(profileName);
    const ui = useUi.getState();
    ui.dismissSetup();
    ui.setScreen("dashboard");
  }

  function fail(message: string, kind?: "credentials" | "network" | "other"): void {
    runRef.current += 1;
    setFailureError(message);
    setStep("failure");
    setFailureFocus(kind === "credentials" ? FOCUS_TOKEN : FOCUS_URL);
    useUi.getState().setFocusedField(null);
  }

  async function runConnecting(urlValue: string, tokenValue: string): Promise<void> {
    const run = runRef.current + 1;
    runRef.current = run;
    const alive = (): boolean => runRef.current === run;
    setStages(initialStages());
    setStep("connecting");
    useUi.getState().setFocusedField(null);
    try {
      const test = await props.setup.testConnection(urlValue, tokenValue);
      if (!alive()) {
        return;
      }
      if (!test.ok) {
        fail(test.error ?? "Connection failed", test.kind);
        return;
      }
      setStages([
        { label: "SELECT 1", state: "done" },
        { label: "applying schema", state: "active" },
        { label: "loading profile", state: "pending" },
      ]);
      const schema = await props.setup.applySchema();
      if (!alive()) {
        return;
      }
      setStages([
        { label: "SELECT 1", state: "done" },
        { label: "applying schema", state: "done", detail: schemaDetail(schema) },
        { label: "loading profile", state: "active" },
      ]);
      const profile = await props.settings.getProfile();
      if (!alive()) {
        return;
      }
      setStages([
        { label: "SELECT 1", state: "done" },
        { label: "applying schema", state: "done", detail: schemaDetail(schema) },
        { label: "loading profile", state: "done" },
      ]);
      if (profile !== null) {
        await finishToApp(profile.name);
        return;
      }
      setName("");
      setEmail("");
      setNameError(null);
      setEmailError(null);
      setProfileError(null);
      setStep("profile");
      useUi.getState().setFocusedField(FOCUS_NAME);
    } catch (error) {
      if (!alive()) {
        return;
      }
      clearTursoConfig();
      const classified = classifyTursoError(error);
      fail(classified.message, classified.kind);
    }
  }

  function backToConnect(focusField: string = failureFocus): void {
    // Values are kept; the failure panel and Esc both land here.
    runRef.current += 1;
    clearTursoConfig();
    setUrlError(null);
    setStep("connect");
    useUi.getState().setFocusedField(focusField);
  }

  function attemptConnect(): void {
    if (url.trim() === "" || token.trim() === "") {
      // Connect is disabled until both fields are non-empty: move focus to
      // the first empty field instead of submitting.
      useUi.getState().setFocusedField(url.trim() === "" ? FOCUS_URL : FOCUS_TOKEN);
      return;
    }
    const schemeError = validateDbUrl(url);
    if (schemeError !== null) {
      setUrlError(schemeError);
      useUi.getState().setFocusedField(FOCUS_URL);
      return;
    }
    setUrlError(null);
    void runConnecting(url.trim(), token);
  }

  async function submitProfile(): Promise<void> {
    const nextNameError = validateProfileName(name);
    const nextEmailError = validateProfileEmail(email);
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    if (nextNameError !== null) {
      useUi.getState().setFocusedField(FOCUS_NAME);
      return;
    }
    if (nextEmailError !== null) {
      useUi.getState().setFocusedField(FOCUS_EMAIL);
      return;
    }
    setProfileError(null);
    try {
      const profile = { name: name.trim(), email: email.trim() };
      await props.settings.saveProfile(profile);
      await finishToApp(profile.name);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : String(error));
    }
  }

  function demoWithMockData(): void {
    // Dev-only affordance (M0 `d` behavior, now step-aware): skip the form
    // and browse the app on mock data. The footer hint carrying this string
    // sits behind the same inline mock guard, so production drops both.
    useUi.getState().dismissSetup();
  }

  useKeyboard((key) => {
    // A modal (command palette, help) layered above owns the keys; ignore
    // them here or its typing would also drive the form behind it.
    if (useUi.getState().modal !== "none") {
      return;
    }
    const plain = !key.ctrl && !key.meta && key.option !== true;
    const setFocus = useUi.getState().setFocusedField;

    if (step === "connecting") {
      if (key.name === "escape") {
        key.preventDefault();
        backToConnect();
      }
      return;
    }

    if (step === "failure") {
      if (key.name === "escape") {
        key.preventDefault();
        backToConnect();
        return;
      }
      if (key.name === "return") {
        key.preventDefault();
        void runConnecting(url.trim(), token);
        return;
      }
      if (plain) {
        const action = key.name.toLowerCase();
        if (action === "r") {
          key.preventDefault();
          void runConnecting(url.trim(), token);
          return;
        }
        if (action === "e") {
          key.preventDefault();
          backToConnect();
        }
      }
      return;
    }

    if (step === "profile") {
      if (key.name === "escape") {
        key.preventDefault();
        backToConnect(FOCUS_URL);
        return;
      }
      if (key.name === "tab") {
        key.preventDefault();
        setFocus(cycleFocus(PROFILE_ORDER, focusedField, key.shift ? -1 : 1));
        return;
      }
      if (key.name === "return") {
        key.preventDefault();
        void submitProfile();
        return;
      }
      // Text inputs own every other key while focused.
      return;
    }

    // Step 1 (connect).
    if (key.name === "escape") {
      key.preventDefault();
      props.quit();
      return;
    }
    if (key.name === "tab") {
      key.preventDefault();
      setFocus(cycleFocus(CONNECT_ORDER, focusedField, key.shift ? -1 : 1));
      return;
    }
    if (key.name === "return") {
      key.preventDefault();
      attemptConnect();
      return;
    }
    if (focusedField === FOCUS_TOKEN && key.ctrl && key.name === "u") {
      // The secure field renders no `<input>` (H1), so Setup owns Ctrl+U as a
      // one-shot clear even though it is not a plain key.
      key.preventDefault();
      setToken("");
      return;
    }
    if (!plain) {
      return;
    }
    if (focusedField === FOCUS_TOKEN) {
      // The secure field renders no `<input>` (H1), so Setup owns its editing:
      // append printable characters and drop the last on Backspace.
      if (key.name === "backspace") {
        key.preventDefault();
        setToken((current) => current.slice(0, -1));
        return;
      }
      if (key.sequence.length === 1 && key.sequence >= " ") {
        key.preventDefault();
        setToken((current) => `${current}${key.sequence}`);
      }
      return;
    }
    if (focusedField === FOCUS_URL) {
      // The URL `<input>` owns printable keys while focused; `d` types here.
      return;
    }
    if (key.name.length === 1) {
      // Form-level typing (Connect focused, or nothing focused - the URL and
      // token fields own their keys otherwise): `d` demos on mock data (dev
      // builds only), any other character jumps into the URL field carrying it.
      // When `d` would not demo (turso mode, or production builds without the
      // mock chunk), it falls through to URL typing like any other character
      // instead of being swallowed.
      if (key.name.toLowerCase() === "d") {
        if (
          (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) &&
          repoMode === "mock"
        ) {
          key.preventDefault();
          demoWithMockData();
          return;
        }
      }
      key.preventDefault();
      setUrl((current) => `${current}${key.sequence}`);
      setFocus(FOCUS_URL);
    }
  });

  // Paste into the secure token field, which renders no `<input>` (H1), so
  // the terminal's bracketed paste never reaches an editable control there.
  // Append the pasted text only while the token field owns focus; the other
  // fields are real `<input>`s and handle their own paste.
  usePaste((event) => {
    if (step !== "connect" || focusedField !== FOCUS_TOKEN) {
      return;
    }
    if (useUi.getState().modal !== "none") {
      return;
    }
    // Match InputRenderable.handlePaste: strip ANSI sequences, then fold to a
    // single printable line (dropping C0/C1 controls and DEL) before appending.
    const pasted = sanitizePastedToken(stripAnsiSequences(decodePasteBytes(event.bytes)));
    if (pasted === "") {
      return;
    }
    setToken((current) => `${current}${pasted}`);
  });

  // Inline mock guard (not a shared const): the bundler folds it and drops
  // this branch - including the badge string - from production builds.
  const mockBadge =
    (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) && repoMode === "mock" ? (
      <box backgroundColor={color(tokens.warning)} paddingLeft={1} paddingRight={1}>
        <text fg={color(theme.dark ? tokens.bg : tokens.fg)}>{"[MOCK DATA MODE]"}</text>
      </box>
    ) : null;

  // Shown only when `d` would actually demo (Connect focused, or nothing
  // focused): the URL `<input>` and the secure token field own `d` as typed
  // input while focused, so an unconditional hint would advertise a shortcut
  // that types a literal "d" instead.
  const demoHint =
    (typeof POS_MOCK_ENABLED === "undefined" ? true : POS_MOCK_ENABLED) &&
    repoMode === "mock" &&
    (focusedField === null || focusedField === FOCUS_CONNECT) ? (
      <text fg={color(tokens.fgSubtle)}>{"d  Demo data (dev only)"}</text>
    ) : null;

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      backgroundColor={color(tokens.bg)}
    >
      <box flexDirection="column" width={formWidth} gap={1}>
        {step === "connect" ? (
          <>
            <text fg={color(tokens.fg)}>{"Welcome to Personal OS"}</text>
            {mockBadge}
            <Field label="Database URL" error={urlError}>
              <TextField
                value={url}
                onChange={(value) => {
                  setUrl(value);
                  if (urlError !== null && validateDbUrl(value) === null) {
                    setUrlError(null);
                  }
                }}
                focused={focusedField === FOCUS_URL}
                placeholder="https://your-db.turso.io"
                width={formWidth}
              />
            </Field>
            <Field label="Auth token">
              <TextField
                value={token}
                focused={focusedField === FOCUS_TOKEN}
                placeholder="Auth token"
                secure={true}
                width={formWidth}
              />
            </Field>
            <Button
              primary={true}
              focused={focusedField === FOCUS_CONNECT}
              disabled={!canSubmit}
              label="Connect"
            />
            <text fg={color(tokens.fgSubtle)}>
              {"Enter  Connect      Tab  next field      Esc  quit"}
            </text>
            {focusedField === FOCUS_TOKEN ? (
              <text fg={color(tokens.fgSubtle)}>{"Ctrl+U  clear token"}</text>
            ) : null}
            {demoHint}
          </>
        ) : null}

        {step === "connecting" ? (
          <>
            <text
              fg={color(tokens.fg)}
            >{`Connecting to ${truncate(url.trim(), formWidth - 14)}`}</text>
            {stages.map((stage) => {
              const marker = stage.state === "done" ? "ok" : stage.state === "active" ? ">>" : "  ";
              const stageColor =
                stage.state === "done"
                  ? tokens.success
                  : stage.state === "active"
                    ? tokens.accent
                    : tokens.fgSubtle;
              const detail = stage.detail !== undefined ? ` (${stage.detail})` : "";
              return (
                <text key={stage.label} fg={color(stageColor)}>
                  {`${marker}  ${stage.label}${detail}`}
                </text>
              );
            })}
            <text fg={color(tokens.fgSubtle)}>{"Esc  back"}</text>
          </>
        ) : null}

        {step === "failure" ? (
          <>
            <text fg={color(tokens.fg)}>{"Could not connect"}</text>
            <text fg={color(tokens.danger)}>{truncate(failureError, formWidth)}</text>
            <text fg={color(tokens.fgMuted)}>{`URL  ${truncate(url.trim(), formWidth - 5)}`}</text>
            <text fg={color(tokens.fgSubtle)}>
              {"r  Retry      e  Edit credentials      Esc  Back"}
            </text>
            <text fg={color(tokens.fgSubtle)}>{"Enter  Retry"}</text>
          </>
        ) : null}

        {step === "profile" ? (
          <>
            <text fg={color(tokens.fg)}>{"Your profile"}</text>
            {mockBadge}
            <Field label="Name" error={nameError}>
              <TextField
                value={name}
                onChange={(value) => {
                  setName(value);
                  if (nameError !== null && validateProfileName(value) === null) {
                    setNameError(null);
                  }
                }}
                focused={focusedField === FOCUS_NAME}
                placeholder="Alex Johnson"
                width={formWidth}
              />
            </Field>
            <Field label="Email" error={emailError}>
              <TextField
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (emailError !== null && validateProfileEmail(value) === null) {
                    setEmailError(null);
                  }
                }}
                focused={focusedField === FOCUS_EMAIL}
                placeholder="alex@example.com"
                width={formWidth}
              />
            </Field>
            {profileError !== null ? <text fg={color(tokens.danger)}>{profileError}</text> : null}
            <Button
              primary={true}
              focused={focusedField === FOCUS_START}
              disabled={false}
              label="Get started"
            />
            <text fg={color(tokens.fgSubtle)}>
              {"Enter  Get started      Tab  next field      Esc  back"}
            </text>
          </>
        ) : null}
      </box>
    </box>
  );
}
