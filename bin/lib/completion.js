// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const registry = require("./registry");

const GLOBAL_COMMANDS = [
  "onboard", "list", "deploy", "setup-spark",
  "start", "stop", "status", "debug", "uninstall",
  "help", "completion", "--help", "-h", "--version", "-v",
];

const SANDBOX_ACTIONS = [
  "connect", "status", "logs", "policy-add", "policy-list", "destroy",
];

// Flags accepted by scripts/debug.sh — keep in sync or update the
// "completion flags match debug.sh" test when debug.sh gains new flags.
const DEBUG_FLAGS = ["--quick", "--sandbox", "--output", "--help"];

function getSandboxNames() {
  try {
    const { sandboxes } = registry.listSandboxes();
    return sandboxes.map((s) => s.name);
  } catch {
    return [];
  }
}

function bash() {
  const globalCmds = GLOBAL_COMMANDS.join(" ");
  const sandboxActions = SANDBOX_ACTIONS.join(" ");
  const debugFlags = DEBUG_FLAGS.join(" ");
  const noArgCmds = GLOBAL_COMMANDS.filter((c) => c !== "debug").join("|");

  return `# nemoclaw bash completion
# Add to ~/.bashrc:  eval "$(nemoclaw completion bash)"

_nemoclaw() {
  local cur prev words cword
  if type _init_completion &>/dev/null; then
    _init_completion || return
  else
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    cword=$COMP_CWORD
  fi

  local global_cmds="${globalCmds}"
  local sandbox_actions="${sandboxActions}"

  if [[ $cword -eq 1 ]]; then
    # Complete global commands + sandbox names
    local sandboxes
    sandboxes="$(nemoclaw completion --list-sandboxes 2>/dev/null)"
    COMPREPLY=($(compgen -W "$global_cmds $sandboxes" -- "$cur"))
    return
  fi

  if [[ $cword -eq 2 ]]; then
    # If first arg is a sandbox name, complete with actions
    case "$prev" in
      ${noArgCmds})
        return ;;
      debug)
        COMPREPLY=($(compgen -W "${debugFlags}" -- "$cur"))
        return ;;
    esac
    # Assume sandbox name → offer actions
    COMPREPLY=($(compgen -W "$sandbox_actions" -- "$cur"))
    return
  fi

  if [[ $cword -eq 3 ]]; then
    local action="\${words[2]}"
    case "$action" in
      logs)
        COMPREPLY=($(compgen -W "--follow" -- "$cur"))
        return ;;
      destroy)
        COMPREPLY=($(compgen -W "--yes --force" -- "$cur"))
        return ;;
    esac
  fi
}

complete -F _nemoclaw nemoclaw
`;
}

// The zsh completion script uses plain string concatenation instead of a single
// template literal.  This avoids mixing JS interpolation (${expr}) with zsh
// parameter expansion (${words[2]}, ${(f)...}) in the same string, which
// previously caused escaping bugs caught only by the linter.

function zsh() {
  const noArgCmds = GLOBAL_COMMANDS.filter((c) => c !== "debug").join("|");

  return "#compdef nemoclaw\n"
    + "# nemoclaw zsh completion\n"
    + '# Add to ~/.zshrc:  eval "$(nemoclaw completion zsh)"\n'
    + "\n"
    + "_nemoclaw() {\n"
    + "  local -a global_cmds sandbox_actions sandboxes\n"
    + "\n"
    + "  global_cmds=(\n"
    + "    'onboard:Configure inference endpoint and credentials'\n"
    + "    'list:List all sandboxes'\n"
    + "    'deploy:Deploy to a Brev VM'\n"
    + "    'setup-spark:Set up on DGX Spark'\n"
    + "    'start:Start auxiliary services'\n"
    + "    'stop:Stop all services'\n"
    + "    'status:Show sandbox list and service status'\n"
    + "    'debug:Collect diagnostics for bug reports'\n"
    + "    'uninstall:Uninstall NemoClaw'\n"
    + "    'help:Show help'\n"
    + "    'completion:Generate shell completion script'\n"
    + "    '--help:Show help'\n"
    + "    '-h:Show help'\n"
    + "    '--version:Show version'\n"
    + "    '-v:Show version'\n"
    + "  )\n"
    + "\n"
    + "  sandbox_actions=(\n"
    + "    'connect:Shell into a running sandbox'\n"
    + "    'status:Sandbox health and NIM status'\n"
    + "    'logs:Stream sandbox logs'\n"
    + "    'policy-add:Add a network or filesystem policy preset'\n"
    + "    'policy-list:List presets'\n"
    + "    'destroy:Stop NIM and delete sandbox'\n"
    + "  )\n"
    + "\n"
    + "  if (( CURRENT == 2 )); then\n"
    + "    # Get sandbox names dynamically\n"
    + '    sandboxes=(${(f)"$(nemoclaw completion --list-sandboxes 2>/dev/null)"})\n'
    + "    _describe 'command' global_cmds -- sandboxes\n"
    + "    return\n"
    + "  fi\n"
    + "\n"
    + "  if (( CURRENT == 3 )); then\n"
    + '    case "${words[2]}" in\n'
    + "      " + noArgCmds + ")\n"
    + "        return ;;\n"
    + "      debug)\n"
    + "        _arguments"
    + DEBUG_FLAGS.map((f) => {
      const desc = { "--quick": "Quick diagnostics", "--sandbox": "Target sandbox", "--output": "Save to file", "--help": "Show help" }[f] || f;
      const extra = f === "--output" ? ":file:_files" : f === "--sandbox" ? ":name: " : "";
      return " '" + f + "[" + desc + "]" + extra + "'";
    }).join("")
    + "\n"
    + "        return ;;\n"
    + "    esac\n"
    + "    # Assume sandbox name → offer actions\n"
    + "    _describe 'action' sandbox_actions\n"
    + "    return\n"
    + "  fi\n"
    + "\n"
    + "  if (( CURRENT == 4 )); then\n"
    + '    case "${words[3]}" in\n'
    + "      logs)\n"
    + "        _arguments '--follow[Follow log output]'\n"
    + "        return ;;\n"
    + "      destroy)\n"
    + "        _arguments '--yes[Skip confirmation]' '--force[Skip confirmation]'\n"
    + "        return ;;\n"
    + "    esac\n"
    + "  fi\n"
    + "}\n"
    + "\n"
    + '_nemoclaw "$@"\n';
}

function fish() {
  const debugFlags = DEBUG_FLAGS;

  return `# nemoclaw fish completion
# Add to ~/.config/fish/completions/nemoclaw.fish
# Or run:  nemoclaw completion fish | source

# Disable file completions by default
complete -c nemoclaw -f

# Global commands
complete -c nemoclaw -n '__fish_use_subcommand' -a 'onboard' -d 'Configure inference endpoint and credentials'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'list' -d 'List all sandboxes'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'deploy' -d 'Deploy to a Brev VM'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'setup-spark' -d 'Set up on DGX Spark'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'start' -d 'Start auxiliary services'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'stop' -d 'Stop all services'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'status' -d 'Show sandbox list and service status'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'debug' -d 'Collect diagnostics for bug reports'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'uninstall' -d 'Uninstall NemoClaw'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'help' -d 'Show help'
complete -c nemoclaw -n '__fish_use_subcommand' -a 'completion' -d 'Generate shell completion script'
complete -c nemoclaw -n '__fish_use_subcommand' -l help -d 'Show help'
complete -c nemoclaw -n '__fish_use_subcommand' -s h -d 'Show help'
complete -c nemoclaw -n '__fish_use_subcommand' -l version -d 'Show version'
complete -c nemoclaw -n '__fish_use_subcommand' -s v -d 'Show version'

# Dynamic sandbox names
complete -c nemoclaw -n '__fish_use_subcommand' -a '(nemoclaw completion --list-sandboxes 2>/dev/null)'

# Sandbox actions (when first arg is not a global command)
set -l global_cmds onboard list deploy setup-spark start stop status debug uninstall help completion
complete -c nemoclaw -n "not __fish_use_subcommand; and not __fish_seen_subcommand_from $global_cmds" -a 'connect' -d 'Shell into sandbox'
complete -c nemoclaw -n "not __fish_use_subcommand; and not __fish_seen_subcommand_from $global_cmds" -a 'status' -d 'Sandbox health and NIM status'
complete -c nemoclaw -n "not __fish_use_subcommand; and not __fish_seen_subcommand_from $global_cmds" -a 'logs' -d 'Stream sandbox logs'
complete -c nemoclaw -n "not __fish_use_subcommand; and not __fish_seen_subcommand_from $global_cmds" -a 'policy-add' -d 'Add a policy preset'
complete -c nemoclaw -n "not __fish_use_subcommand; and not __fish_seen_subcommand_from $global_cmds" -a 'policy-list' -d 'List presets'
complete -c nemoclaw -n "not __fish_use_subcommand; and not __fish_seen_subcommand_from $global_cmds" -a 'destroy' -d 'Stop NIM and delete sandbox'

# debug flags
complete -c nemoclaw -n '__fish_seen_subcommand_from debug' -l quick -d 'Quick diagnostics'
complete -c nemoclaw -n '__fish_seen_subcommand_from debug' -l sandbox -d 'Target sandbox' -r
complete -c nemoclaw -n '__fish_seen_subcommand_from debug' -l output -d 'Save diagnostics to file' -r
complete -c nemoclaw -n '__fish_seen_subcommand_from debug' -l help -d 'Show help'

# logs flags
complete -c nemoclaw -n '__fish_seen_subcommand_from logs' -l follow -d 'Follow log output'

# destroy flags
complete -c nemoclaw -n '__fish_seen_subcommand_from destroy' -l yes -d 'Skip confirmation'
complete -c nemoclaw -n '__fish_seen_subcommand_from destroy' -l force -d 'Skip confirmation'

# completion subcommands
complete -c nemoclaw -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish' -d 'Shell type'
`;
}

function listSandboxNames() {
  const names = getSandboxNames();
  if (names.length > 0) {
    console.log(names.join("\n"));
  }
}

function run(args) {
  if (args[0] === "--list-sandboxes") {
    listSandboxNames();
    return;
  }

  const shell = args[0];

  if (!shell) {
    // Auto-detect from SHELL env
    const envShell = process.env.SHELL || "";
    if (envShell.includes("zsh")) {
      process.stdout.write(zsh());
    } else if (envShell.includes("fish")) {
      process.stdout.write(fish());
    } else {
      process.stdout.write(bash());
    }
    return;
  }

  switch (shell) {
    case "bash":
      process.stdout.write(bash());
      break;
    case "zsh":
      process.stdout.write(zsh());
      break;
    case "fish":
      process.stdout.write(fish());
      break;
    default:
      console.error(`  Unknown shell: ${shell}`);
      console.error("  Supported: bash, zsh, fish");
      process.exit(1);
  }
}

module.exports = { run, DEBUG_FLAGS };
