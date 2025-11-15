# CommentAI 🤖
_Give your team an AI-powered code review assistant today! 🚀_

A GitHub Action that leverages AI models to automatically analyze and comment on pull requests, providing intelligent feedback to improve code quality and collaboration.

## Overview
CommentAI is an automated code review assistant that integrates directly into your GitHub workflow. When a pull request is opened or updated, this action calls an AI model to analyze the changes and post meaningful comments with suggestions, questions, and observations about the code.

## Features
🤖 AI-Powered Analysis: Uses advanced AI models to understand code context and provide relevant feedback

🔧 Easy Integration: Simple setup with minimal configuration required

📝 Smart Comments: Provides constructive feedback on code changes

⚡ Real-time Processing: Automatically triggers on pull request events

🛡 Safe & Secure: Runs in isolated GitHub Actions environment

🔍 Context-Aware: Analyzes the entire PR context including files changed and commit messages

## Quick Start
### Prerequisites
- GitHub repository with Actions enabled
- Access to an AI model API (OpenAI, Anthropic, etc.)
- API key for your chosen AI service

### Basic Setup
1. Create a workflow file in your repository at .github/workflows/commentai.yml:

```
name: AI Code Reviewer

on:
  workflow_dispatch:
  pull_request:
    types:
      - opened
      - synchronize
      - review_requested
      - labeled
permissions: write-all
jobs:
  code_review:
    if: ${{ github.event.label.name == '🤖 openai_requested' }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: AI Code Reviewer
        uses: dvdsantana/commentai@main
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # The GITHUB_TOKEN is there by default so you just need to keep it like it is and not necessarily need to add it as secret as it will throw an error. [More Details](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#about-the-github_token-secret)
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          OPENAI_API_MODEL: ${{ vars.OPENAI_API_MODEL }} # Optional: defaults to "gpt-3.5-turbo"
          OPENAI_API_PROMPT: ${{ vars.OPEN_API_PROMPT }}
          OPENAI_IGNORE_FILES: ${{ vars.OPENAI_IGNORE_FILES }} # Optional: exclude patterns separated by commas
```
2. Add your API key as a repository secret:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add a new secret named OPENAI_API_KEY with your API key

## Configuration Options
| Input               | Description                 | Required | Default       |
|---------------------|-----------------------------|----------|---------------|
| GITHUB_TOKEN        | GitHub token for API access | Yes      |               |
| OPENAI_API_KEY      | API key for OpenAI services | Yes      |               |
| OPENAI_API_MODEL    | OpenAI model to use         | NO       | gpt-3.5-turbo |
| OPENAI_API_PROMPT   | System prompt               | Yes      |               |
| OPENAI_IGNORE_FILES | File patterns to exclude    | No       |               |

## Security Considerations
🔐 Never hardcode API keys - always use GitHub Secrets

🔍 Review AI suggestions before implementing them

🛡 Be cautious with sensitive code - AI services may log interactions

📜 Understand your AI provider's data usage policies

## Troubleshooting
### Common Issues
**No comments are posted:**
- [ ] Check that the workflow is triggering on PR events
- [ ] Verify API key is correctly set as a repository secret
- [ ] Ensure the GitHub token has appropriate permissions

**Comments are irrelevant:**
- [ ] Modify the system prompt to be more specific
- [ ] Consider using a different AI model

### Performance issues:
- [ ] Use file patterns to exclude large directories
- [ ] Consider running only on specific file types
