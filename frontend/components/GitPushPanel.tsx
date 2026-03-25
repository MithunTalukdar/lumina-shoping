import React, { useState } from 'react';

const DEFAULT_REPO_URL = 'https://github.com/MithunTalukdar/lumina-shoping.git';
const DEFAULT_BRANCH = 'main';

type ThemeMode = 'dark' | 'light';
type StatusTone = 'success' | 'error' | 'info';

type FieldErrors = Partial<Record<'repoUrl' | 'branch' | 'commitMessage' | 'auth', string>>;

interface StatusMessage {
  tone: StatusTone;
  title: string;
  detail: string;
}

interface GeneratedCommands {
  preview: string;
  copyValue: string;
  usesEmbeddedAuth: boolean;
  remotePreview: string;
}

const buildRepoUrlWithAuth = (repoUrl: string, username: string, token: string) => {
  if (!username || !token) {
    return repoUrl;
  }

  try {
    const parsedUrl = new URL(repoUrl);

    if (parsedUrl.protocol !== 'https:') {
      return repoUrl;
    }

    parsedUrl.username = username;
    parsedUrl.password = token;
    return parsedUrl.toString();
  } catch {
    return repoUrl;
  }
};

const maskRepoToken = (repoUrl: string, username: string, token: string) => {
  if (!username || !token) {
    return repoUrl;
  }

  try {
    const parsedUrl = new URL(repoUrl);

    if (parsedUrl.protocol !== 'https:') {
      return repoUrl;
    }

    parsedUrl.username = username;
    parsedUrl.password = '********';
    return parsedUrl.toString();
  } catch {
    return repoUrl;
  }
};

const escapeCommitMessage = (message: string) =>
  message
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/["\\$`]/g, '\\$&');

const describeRepo = (repoUrl: string) => {
  try {
    const parsedUrl = new URL(repoUrl);
    return `${parsedUrl.hostname}${parsedUrl.pathname.replace(/\.git$/, '')}`;
  } catch {
    return repoUrl;
  }
};

const buildCommands = (repoUrl: string, branch: string, commitMessage: string) => [
  'git init',
  `git remote add origin ${repoUrl}`,
  'git add .',
  `git commit -m "${escapeCommitMessage(commitMessage)}"`,
  `git branch -M ${branch}`,
  `git push -u origin ${branch}`,
].join('\n');

const GitPushPanel: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO_URL);
  const [branch, setBranch] = useState(DEFAULT_BRANCH);
  const [commitMessage, setCommitMessage] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generatedCommands, setGeneratedCommands] = useState<GeneratedCommands | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    tone: 'info',
    title: 'Command workspace ready',
    detail: 'Fill in the project details, generate your Git script, then copy it when you are happy with the output.',
  });
  const [copyLabel, setCopyLabel] = useState('Copy to Clipboard');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const isDarkMode = themeMode === 'dark';
  const repoDescription = describeRepo(repoUrl.trim() || DEFAULT_REPO_URL);
  const authReady = username.trim().length > 0 && token.trim().length > 0;
  const commandTotal = generatedCommands ? generatedCommands.preview.split('\n').length : 6;

  const shellClass = isDarkMode
    ? 'border border-white/10 bg-[rgba(7,16,31,0.88)] text-[#e5eefc] shadow-[0_28px_90px_-48px_rgba(2,6,23,0.95)]'
    : 'border border-[rgba(148,163,184,0.26)] bg-[rgba(255,255,255,0.86)] text-[#0f172a] shadow-[0_24px_80px_-42px_rgba(15,23,42,0.32)]';
  const panelClass = isDarkMode
    ? 'border border-white/10 bg-white/5'
    : 'border border-[rgba(148,163,184,0.2)] bg-[rgba(248,250,252,0.78)]';
  const inputClass = isDarkMode
    ? 'w-full rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.52)] px-4 py-3 text-sm font-medium text-[#e5eefc] outline-none transition-all placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20'
    : 'w-full rounded-2xl border border-[rgba(148,163,184,0.24)] bg-[rgba(255,255,255,0.95)] px-4 py-3 text-sm font-medium text-[#0f172a] outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15';
  const labelClass = isDarkMode ? 'text-slate-300' : 'text-[#475569]';
  const helperClass = isDarkMode ? 'text-slate-400' : 'text-[#64748b]';
  const codeClass = isDarkMode
    ? 'border border-white/10 bg-[#020817] text-[#d8f4ff]'
    : 'border border-[rgba(15,23,42,0.12)] bg-[#0f172a] text-[#e2e8f0]';
  const primaryButtonClass = isDarkMode
    ? 'inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5'
    : 'inline-flex items-center justify-center rounded-2xl bg-[#0f172a] px-5 py-3 text-sm font-black text-white transition-transform hover:-translate-y-0.5';
  const secondaryButtonClass = isDarkMode
    ? 'inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-100 transition-colors hover:bg-white/10'
    : 'inline-flex items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.22)] bg-[rgba(255,255,255,0.9)] px-5 py-3 text-sm font-bold text-[#0f172a] transition-colors hover:bg-[rgba(255,255,255,0.98)]';

  const statusToneClass = (() => {
    switch (statusMessage.tone) {
      case 'success':
        return isDarkMode
          ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
          : 'border border-emerald-300/60 bg-emerald-50 text-emerald-800';
      case 'error':
        return isDarkMode
          ? 'border border-rose-400/20 bg-rose-400/10 text-rose-100'
          : 'border border-rose-300/60 bg-rose-50 text-rose-800';
      default:
        return isDarkMode
          ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
          : 'border border-cyan-300/60 bg-cyan-50 text-cyan-800';
    }
  })();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedRepoUrl = repoUrl.trim();
    const trimmedBranch = branch.trim();
    const trimmedCommitMessage = commitMessage.trim();
    const trimmedUsername = username.trim();
    const trimmedToken = token.trim();
    const nextErrors: FieldErrors = {};

    if (!trimmedRepoUrl) {
      nextErrors.repoUrl = 'Repository URL is required.';
    }

    if (!trimmedBranch) {
      nextErrors.branch = 'Branch name is required.';
    }

    if (!trimmedCommitMessage) {
      nextErrors.commitMessage = 'Commit message is required.';
    }

    if ((trimmedUsername || trimmedToken) && !(trimmedUsername && trimmedToken)) {
      nextErrors.auth = 'Fill both username and token, or leave both blank.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setCopyLabel('Copy to Clipboard');
      setStatusMessage({
        tone: 'error',
        title: 'Validation needs attention',
        detail: 'Complete the required fields before generating Git commands.',
      });
      return;
    }

    const authRepoUrl = buildRepoUrlWithAuth(trimmedRepoUrl, trimmedUsername, trimmedToken);
    const previewRepoUrl = maskRepoToken(trimmedRepoUrl, trimmedUsername, trimmedToken);

    setGeneratedCommands({
      preview: buildCommands(previewRepoUrl, trimmedBranch, trimmedCommitMessage),
      copyValue: buildCommands(authRepoUrl, trimmedBranch, trimmedCommitMessage),
      usesEmbeddedAuth: Boolean(trimmedUsername && trimmedToken),
      remotePreview: previewRepoUrl,
    });
    setCopyLabel('Copy to Clipboard');
    setLastGeneratedAt(
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
    setStatusMessage({
      tone: 'success',
      title: 'Git commands generated',
      detail: `Your ${trimmedBranch} push script is ready to review and copy.`,
    });
  };

  const handleCopy = async () => {
    if (!generatedCommands) {
      setStatusMessage({
        tone: 'error',
        title: 'Nothing to copy yet',
        detail: 'Generate your Git commands first, then copy them from the command preview card.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCommands.copyValue);
      setCopyLabel('Copied');
      setStatusMessage({
        tone: 'success',
        title: 'Commands copied',
        detail: generatedCommands.usesEmbeddedAuth
          ? 'The copied version includes the authenticated remote URL while the preview keeps the token masked.'
          : 'The generated Git script is now in your clipboard.',
      });
    } catch {
      setCopyLabel('Copy failed');
      setStatusMessage({
        tone: 'error',
        title: 'Clipboard access failed',
        detail: 'Your browser blocked clipboard access. Copy the command block manually instead.',
      });
    }
  };

  const handleReset = () => {
    setRepoUrl(DEFAULT_REPO_URL);
    setBranch(DEFAULT_BRANCH);
    setCommitMessage('');
    setUsername('');
    setToken('');
    setErrors({});
    setGeneratedCommands(null);
    setCopyLabel('Copy to Clipboard');
    setLastGeneratedAt(null);
    setStatusMessage({
      tone: 'info',
      title: 'Defaults restored',
      detail: 'The form has been reset to the default repository and main branch.',
    });
  };

  const simulateStatus = (tone: 'success' | 'error') => {
    if (!generatedCommands) {
      setStatusMessage({
        tone: 'error',
        title: 'Generate commands first',
        detail: 'The status simulator needs a command set before it can mimic a push result.',
      });
      return;
    }

    if (tone === 'success') {
      setStatusMessage({
        tone: 'success',
        title: 'Push simulation succeeded',
        detail: `Origin accepted ${branch.trim() || DEFAULT_BRANCH} and linked it with the upstream tracking branch.`,
      });
      return;
    }

    setStatusMessage({
      tone: 'error',
      title: 'Push simulation failed',
      detail: 'Remote authentication was rejected. Double-check the repository URL and personal access token.',
    });
  };

  const renderError = (field: keyof FieldErrors) =>
    errors[field] ? <p className="mt-2 text-sm font-semibold text-rose-400">{errors[field]}</p> : null;

  return (
    <div className="py-10">
      <section className="fashion-stage relative overflow-hidden rounded-[2.6rem] border border-white/10 px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Deployment Workflow Console
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-[4.1rem] xl:leading-[0.96]">
                  Generate clean Git push commands with a polished admin-style workspace.
                </h1>
                <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                  Build a ready-to-run Git script, preview authenticated remotes safely, and copy the exact command sequence you need for a smooth push flow.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setThemeMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'))}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                isDarkMode
                  ? 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                  : 'border border-[rgba(148,163,184,0.24)] bg-[rgba(255,255,255,0.86)] text-[#0f172a] hover:bg-[rgba(255,255,255,0.96)]'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${isDarkMode ? 'bg-cyan-300' : 'bg-[#0f172a]'}`} />
              {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <div className={`rounded-[2rem] p-6 backdrop-blur-xl ${shellClass}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.22em] ${labelClass}`}>Workspace Summary</p>
                    <h2 className="mt-2 text-3xl font-black">Git Push Form Builder</h2>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${panelClass}`}>
                    {lastGeneratedAt ? `Last generated at ${lastGeneratedAt}` : 'Waiting for the first command set'}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className={`rounded-2xl p-4 ${panelClass}`}>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}>Repository</p>
                    <p className="mt-2 text-lg font-black break-all">{repoDescription}</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${panelClass}`}>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}>Target Branch</p>
                    <p className="mt-2 text-lg font-black">{branch.trim() || 'Not set yet'}</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${panelClass}`}>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}>Auth Mode</p>
                    <p className="mt-2 text-lg font-black">{authReady ? 'Token Ready' : 'Prompt on Push'}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className={`rounded-[2rem] p-6 backdrop-blur-xl ${shellClass}`}>
                <div className="flex flex-col gap-2">
                  <p className={`text-xs font-black uppercase tracking-[0.22em] ${labelClass}`}>Project Details</p>
                  <h2 className="text-2xl font-black">Build your push command set</h2>
                  <p className={`text-sm ${helperClass}`}>
                    Required fields are validated before the commands are generated, and authentication details stay optional.
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className={`mb-2 block text-sm font-bold ${labelClass}`} htmlFor="repo-url">
                      Repository URL
                    </label>
                    <input
                      id="repo-url"
                      type="url"
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                      placeholder={DEFAULT_REPO_URL}
                      className={inputClass}
                      aria-invalid={Boolean(errors.repoUrl)}
                    />
                    <p className={`mt-2 text-xs font-medium ${helperClass}`}>
                      Default remote is prefilled with your Lumina repository.
                    </p>
                    {renderError('repoUrl')}
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                      <label className={`mb-2 block text-sm font-bold ${labelClass}`} htmlFor="branch-name">
                        Branch Name
                      </label>
                      <input
                        id="branch-name"
                        type="text"
                        value={branch}
                        onChange={(event) => setBranch(event.target.value)}
                        placeholder={DEFAULT_BRANCH}
                        className={inputClass}
                        aria-invalid={Boolean(errors.branch)}
                      />
                      {renderError('branch')}
                    </div>

                    <div>
                      <label className={`mb-2 block text-sm font-bold ${labelClass}`} htmlFor="commit-message">
                        Commit Message
                      </label>
                      <textarea
                        id="commit-message"
                        value={commitMessage}
                        onChange={(event) => setCommitMessage(event.target.value)}
                        placeholder="feat: ship the new storefront command center"
                        rows={4}
                        className={`${inputClass} resize-none`}
                        aria-invalid={Boolean(errors.commitMessage)}
                      />
                      {renderError('commitMessage')}
                    </div>
                  </div>

                  <div className={`rounded-[1.6rem] p-4 ${panelClass}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className={`text-sm font-bold ${labelClass}`}>Optional Authentication</p>
                        <p className={`text-xs font-medium ${helperClass}`}>
                          Provide both fields to embed HTTPS credentials in the copied remote URL. The preview always masks the token.
                        </p>
                      </div>
                      <span className={`text-xs font-black uppercase tracking-[0.18em] ${helperClass}`}>
                        Optional
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className={`mb-2 block text-sm font-bold ${labelClass}`} htmlFor="username">
                          Username
                        </label>
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          placeholder="github-username"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={`mb-2 block text-sm font-bold ${labelClass}`} htmlFor="token">
                          Personal Access Token
                        </label>
                        <input
                          id="token"
                          type="password"
                          value={token}
                          onChange={(event) => setToken(event.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    {renderError('auth')}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" className={primaryButtonClass}>
                      Generate Git Commands
                    </button>
                    <button type="button" onClick={handleReset} className={secondaryButtonClass}>
                      Reset Defaults
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className={`rounded-[2rem] p-6 backdrop-blur-xl ${shellClass}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.22em] ${labelClass}`}>Generated Commands</p>
                    <h2 className="mt-2 text-2xl font-black">Copy-ready Git script</h2>
                    <p className={`mt-2 text-sm ${helperClass}`}>
                      Generated commands appear here after you submit the form.
                    </p>
                  </div>
                  <button type="button" onClick={handleCopy} className={secondaryButtonClass}>
                    {copyLabel}
                  </button>
                </div>

                <div className={`mt-6 overflow-hidden rounded-[1.6rem] ${codeClass}`}>
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    <span>git-script.sh</span>
                    <span>{commandTotal} commands</span>
                  </div>
                  <pre className="overflow-x-auto p-5 text-sm leading-7">
                    <code>
                      {generatedCommands?.preview ||
                        [
                          'git init',
                          `git remote add origin ${DEFAULT_REPO_URL}`,
                          'git add .',
                          'git commit -m "<your-message>"',
                          `git branch -M ${DEFAULT_BRANCH}`,
                          `git push -u origin ${DEFAULT_BRANCH}`,
                        ].join('\n')}
                    </code>
                  </pre>
                </div>

                {generatedCommands?.usesEmbeddedAuth && (
                  <p className="mt-4 text-sm font-medium text-cyan-200">
                    Token is masked in the preview. The copied version includes the full authenticated remote URL.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-[2rem] p-5 backdrop-blur-xl ${shellClass}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.2em] ${labelClass}`}>Remote Preview</p>
                  <p className="mt-3 break-all text-sm font-semibold">
                    {generatedCommands?.remotePreview || DEFAULT_REPO_URL}
                  </p>
                  <p className={`mt-3 text-sm ${helperClass}`}>
                    {(generatedCommands?.usesEmbeddedAuth ?? authReady)
                      ? 'Credentials are prepared for HTTPS push and kept hidden in the visual preview.'
                      : 'No inline credentials detected. Git will rely on your configured credential helper or prompt.'}
                  </p>
                </div>

                <div className={`rounded-[2rem] p-5 backdrop-blur-xl ${shellClass}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.2em] ${labelClass}`}>Push Status Simulator</p>
                  <p className={`mt-3 text-sm ${helperClass}`}>
                    Use the simulator to preview success and failure states in the dashboard without touching a real remote.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => simulateStatus('success')}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
                    >
                      Simulate Success
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateStatus('error')}
                      className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
                    >
                      Simulate Error
                    </button>
                  </div>
                </div>
              </div>

              <div className={`rounded-[2rem] p-5 ${statusToneClass}`} aria-live="polite">
                <p className="text-xs font-black uppercase tracking-[0.2em]">Status</p>
                <h3 className="mt-2 text-xl font-black">{statusMessage.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed">{statusMessage.detail}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GitPushPanel;
