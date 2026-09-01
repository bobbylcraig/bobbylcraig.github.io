# Bobby's Homepage

Bobby Craig's personal site and writing archive.

## Local Development

Use the pinned Ruby toolchain to build the production site:

```bash
mise x ruby@3.3.11 -- bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`.

Browser checks use the pinned Node toolchain:

```bash
mise x node@24.10.0 -- npm test
```

## Deployment

This site is automatically built and deployed to GitHub Pages via GitHub Actions on every push to the `master` branch.

## Built With

- [Jekyll](https://jekyllrb.com/) (v4.4)
- [Sass](https://sass-lang.com/) (using `sass-embedded` in private CI)
- [Playwright](https://playwright.dev/) for production-output browser checks
- GitHub Actions for CI/CD
