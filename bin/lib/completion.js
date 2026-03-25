// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const registry = require("./registry");

const GLOBAL_COMMANDS = [
  "onboard", "list", "deploy", "setup-spark",
  "start", "stop", "status", "debug", "uninstall",
  "help", "completion",
];

const SANDBOX_ACTIONS = [
  "connect", "status", "logs", "policy-add", "policy-list", "destroy",
];

function getSandboxNames() {
  try {
    const { sandboxes } = registry.listSandboxes();
    return sandboxes.map((s) => s.name);
  } catch {
    return [];
  }
}

function bash() {
  return `# nemoclaw bash completion
# Add to ~/.bashrc:  eval "$(nemoclaw completion bash)"

_nemoclaw() {
  local cur prev words cword
  _init_completion || return

  local global_cmds="${GLOBAL_COMMANDS.join(" ")}"
  local sandbox_actions="${SANDBOX_ACTIONS.join(" ")}"

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
      onboard|list|start|stop|status|help|completion|uninstall)
        return ;;
      deploy)
        return ;;
      debug)
        COMPREPLY=($(compgen -W "--quick --output --help" -- "$cur"))
        return ;;
    esac
    # Assume sandbox name → offer actions
    COMPREPLY=($(compgen -W "$sandbox_actions" -- "$cur"))
    return
  fi

  if [[ $cword -eq 3 ]]; then
    local action="${words[2]}"
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

function zsh() {
  return `#compdef nemoclaw
# nemoclaw zsh completion
# Add to ~/.zshrc:  eval "$(nemoclaw completion zsh)"

_nemoclaw() {
  local -a global_cmds sandbox_actions sandboxes

  global_cmds=(
    'onboard:Configure inference endpoint and credentials'
    'list:List all sandboxes'
    'deploy:Deploy to a Brev VM'
    'setup-spark:Set up on DGX Spark'
    'start:Start auxiliary services'
    'stop:Stop all services'
    'status:Show sandbox list and service status'
    'debug:Collect diagnostics for bug reports'
    'uninstall:Uninstall NemoClaw'
    'help:Show help'
    'completion:Generate shell completion script'
  )

  sandbox_actions=(
    'connect:Shell into a running sandbox'
    'status:Sandbox health and NIM status'
    'logs:Stream sandbox logs'
    'policy-add:Add a network or filesystem policy preset'
    'policy-list:List presets'
    'destroy:Stop NIM and delete sandbox'
  )

  if (( CURRENT == 2 )); then
    # Get sandbox names dynamically
    sandboxes=(\${(f)"$(nemoclaw completion --list-sandboxes 2>/dev/null)"})
    _describe 'command' global_cmds -- sandboxes
    return
  fi

  if (( CURRENT == 3 )); then
    case "\${words[2]}" in
      onboard|list|start|stop|status|help|completion|uninstall)
        return ;;
      deploy)
        return ;;
      debug)
        _arguments '--quick[Quick diagnostics]' '--output[Save to file]:file:_files' '--help[Show help]'
        return ;;
    esac
    # Assume sandbox name → offer actions
    _describe 'action' sandbox_actions
    return
  fi

  if (( CURRENT == 4 )); then
    case "\${words[3]}" in
      logs)
        _arguments '--follow[Follow log output]'
        return ;;
      destroy)
        _arguments '--yes[Skip confirmation]' '--force[Skip confirmation]'
        return ;;
    esac
  fi
}

_nemoclaw "\$@"
`;
}

function fish() {
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
  if (args.includes("--list-sandboxes")) {
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

module.exports = { run };
