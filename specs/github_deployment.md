# Implementation Plan - Configure GitHub Actions for Static Site Deployment

Create a GitHub Actions workflow to automatically build and deploy the Next.js static site to GitHub Pages whenever changes are pushed to the main branch.

## User Review Required

> [!IMPORTANT]
> **Deployment Scope**:
> - The action will build the static site located in `file:///Users/Tayler/workspace/vbdboard/site` (output: `site/out`).
> - The workflow targets the repository's `gh-pages` branch.
> - No changes are made to the scraper code or workspace root structure.

## Open Questions

1. **GitHub Pages Branch**: Should we use the default `gh-pages` branch or a custom one (e.g., `docs`)? *(Proposed default: `gh-pages` as it is standard)*
2. **Base Path**: If the repository URL is `username.github.io/vbdboard`, the Next.js app needs `basePath: '/vbdboard'`. Should this be hardcoded or configurable? *(Proposed default: hardcoded based on repository name)*

---

## Proposed Changes

### [NEW] [site/.gitignore](file:///Users/Tayler/workspace/vbdboard/site/.gitignore)
- Ensure the output directory is excluded from version control:
  ```
  out/
  .next/
  node_modules/
  ```

### [MODIFY] [site/next.config.mjs](file:///Users/Tayler/workspace/vbdboard/site/next.config.mjs)
- Add `basePath` configuration if hosting under a subpath:
  ```typescript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: 'export',       // Static HTML export
    trailingSlash: true,      // Required for static exports
    distDir: 'out',         // Output to 'out' directory
    images: {
      unoptimized: true,    // Required for static export
    },
    // basePath: '/vbdboard',  // Uncomment if hosting under a subpath
  };
  export default nextConfig;
  ```

### [NEW] [.github/workflows/deploy-site.yml](file:///Users/Tayler/workspace/vbdboard/.github/workflows/deploy-site.yml)
- Create a CI/CD workflow:

  ```yaml
  name: Deploy Next.js Site to GitHub Pages

  on:
    push:
      branches:
        - main
      paths:
        - 'site/**'

  jobs:
    deploy:
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: ./site
      permissions:
        contents: write  # Required to push to gh-pages

      steps:
        - name: Checkout repository
          uses: actions/checkout@v6

        - name: Set up Node.js
          uses: actions/setup-node@v6
          with:
            node-version: '22.x'
            cache: 'npm'
            cache-dependency-path: '**/package-lock.json'

        - name: Install dependencies
          run: npm ci

        - name: Build Next.js site
          run: npm run build

        - name: Deploy to GitHub Pages
          uses: peaceiris/actions-gh-pages@v4
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_branch: gh-pages  # Target branch for deployment
            publish_dir: ./out        # Directory to publish from
            user_name: 'github-actions[bot]'
            user_email: '[EMAIL_ADDRESS]'
            commit_message: '🚀 Automated site deployment'
  ```

### [MODIFY] [.gitignore](file:///Users/Tayler/workspace/vbdboard/.gitignore)
- Add generated site files to prevent committing build artifacts:

  ```
  site/out/
  site/.next/
  site/node_modules/
  ```

## Verification Plan

### Manual Verification
1. Push changes to the `main` branch with new or updated files in the `site/` directory:
   ```bash
   git add .github/workflows/deploy-site.yml site/.gitignore
   git commit -m "feat: Add GitHub Actions deployment workflow"
   git push
   ```

2. Monitor the workflow status in the **Actions** tab of the GitHub repository.
3. Once the workflow completes successfully, verify the site is accessible at:
   - **Repository Root**: `https://username.github.io/vbdboard` (if `basePath` is commented out)
   - **Subpath**: `https://username.github.io/vbdboard/` (if `basePath` is enabled)