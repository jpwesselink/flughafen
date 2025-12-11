## [1.2.1](https://github.com/jpwesselink/flughafen/compare/v1.2.0...v1.2.1) (2025-12-11)


### Bug Fixes

* depdendency resolution points to package rather than workspace ([b9bb109](https://github.com/jpwesselink/flughafen/commit/b9bb109f5c5e0dff7af5238fa33e1dd71d5df81c))

# [1.2.0](https://github.com/jpwesselink/flughafen/compare/v1.1.2...v1.2.0) (2025-12-08)


### Features

* **validation:** add vulnerability checking and improve validation system ([#6](https://github.com/jpwesselink/flughafen/issues/6)) ([d11e93b](https://github.com/jpwesselink/flughafen/commit/d11e93bd5ca6ff5ab9a22713214f2483cefde0fe))

## [1.1.2](https://github.com/jpwesselink/flughafen/compare/v1.1.1...v1.1.2) (2025-12-05)


### Bug Fixes

* documentation accuracy and ESM-only build ([#2](https://github.com/jpwesselink/flughafen/issues/2)) ([f197f10](https://github.com/jpwesselink/flughafen/commit/f197f1043667adb6d0e7310a9e497fdb20758270))

## [1.1.1](https://github.com/jpwesselink/flughafen/compare/v1.1.0...v1.1.1) (2025-12-05)


### Bug Fixes

* trigger 1.1.1 release (npm blocked 1.1.0 for CLI) ([cc0e68d](https://github.com/jpwesselink/flughafen/commit/cc0e68d399491008841550df5c0cfd28879493a1))

# [1.1.0](https://github.com/jpwesselink/flughafen/compare/v1.0.3...v1.1.0) (2025-12-05)


### Bug Fixes

* align beta release workflow with main release (pnpm pack + npm publish for OIDC) ([b657054](https://github.com/jpwesselink/flughafen/commit/b657054d662e447b61ce5bf13479c6da178397b0))
* align beta release workflow with main release (pnpm pack + npm publish for OIDC) ([97b4cf5](https://github.com/jpwesselink/flughafen/commit/97b4cf594093736b72567f1f941606e6f3dead11))
* pass PR_VERSION via step env instead of with block ([c243186](https://github.com/jpwesselink/flughafen/commit/c243186172ac44f5c715087b67564bc649bb9f45))
* simplify beta version setting with npm pkg set ([bfd0df8](https://github.com/jpwesselink/flughafen/commit/bfd0df88c01fc78e427753fd219072a3bb3f9c7c))


### Features

* force a minor bump ([af99097](https://github.com/jpwesselink/flughafen/commit/af99097428534c01ab8c6883d154a3d8a685a8c0))

# 1.0.0 (2025-12-05)


### Features

* force a minor bump ([#1](https://github.com/jpwesselink/flughafen/issues/1)) ([d07ca53](https://github.com/jpwesselink/flughafen/commit/d07ca53c1bd0d4737f8680b2dd0df895ba445654))
* push it real good ([781e851](https://github.com/jpwesselink/flughafen/commit/781e851748208bfbc846f04198684d62854d54a7))

# 1.0.0 (2025-12-05)


### Features

* push it real good ([781e851](https://github.com/jpwesselink/flughafen/commit/781e851748208bfbc846f04198684d62854d54a7))

## [1.0.3](https://github.com/jpwesselink/flughafen/compare/v1.0.2...v1.0.3) (2025-12-04)


### Bug Fixes

* add repository field to CLI package.json for npm provenance ([726c99c](https://github.com/jpwesselink/flughafen/commit/726c99c15225e00e3aa8332a9836f934707cb5b4))

## [1.0.2](https://github.com/jpwesselink/flughafen/compare/v1.0.1...v1.0.2) (2025-12-04)


### Bug Fixes

* proper OIDC setup for npm trusted publishing ([2dadc2a](https://github.com/jpwesselink/flughafen/commit/2dadc2a304c4cc215623fcedc27cb18a5f29fc6c))
* use npm publish instead of pnpm for OIDC support ([b30425d](https://github.com/jpwesselink/flughafen/commit/b30425dac82092fa6d6f4963e8a2474e7a76356a))

## [1.0.1](https://github.com/jpwesselink/flughafen/compare/v1.0.0...v1.0.1) (2025-12-04)


### Bug Fixes

* add --provenance flag for npm OIDC publishing ([53a9981](https://github.com/jpwesselink/flughafen/commit/53a9981d74a131421b4ebf61db801b2955795985))
* remove registry-url from release job for OIDC auth ([d643b5d](https://github.com/jpwesselink/flughafen/commit/d643b5daedebf02fa3629514f63262a6d9f05f40))

# 1.0.0 (2025-12-04)


### Bug Fixes

* add GITHUB_TOKEN to dogfood and roundtrip tests ([3a9e1fc](https://github.com/jpwesselink/flughafen/commit/3a9e1fce33e57d3892b1a8e2ee2968e9cfaa694b))
* configure npm OIDC provenance for trusted publishing ([4bf2550](https://github.com/jpwesselink/flughafen/commit/4bf2550aee4e5e44fd48668668945c02daad5b56))
* fixing workflow ([c954b44](https://github.com/jpwesselink/flughafen/commit/c954b447f66c62f68b21c0ea0626935fad46a60a))
* integrate typecheck and linting in build pipeline ([5975443](https://github.com/jpwesselink/flughafen/commit/5975443d5bb80f365ef67f60af590b0b12d0bbc0))
* pnpm setup ([2479ac0](https://github.com/jpwesselink/flughafen/commit/2479ac0d19edc19cd8295b71638a6b837157dac1))
* pnpm setup ([0def125](https://github.com/jpwesselink/flughafen/commit/0def1253178ffe5643da9f86f5e39dad5a03d39e))
* remove [@ts-expect-error](https://github.com/ts-expect-error) type tests that break build ([4ae365a](https://github.com/jpwesselink/flughafen/commit/4ae365a559e9a7e932f952f6b8c37df6f719ebd4))
* resolve turbo.json duplicate lint key and package.json exports ([edbc031](https://github.com/jpwesselink/flughafen/commit/edbc03147556a1142a604c24e7f276f4d49071cc))
* resolve type errors and add type checking to build ([420277b](https://github.com/jpwesselink/flughafen/commit/420277b8daae6c402ceadc536518b1622bfdd7cc))
* use Node 22 for all CI jobs ([21c4768](https://github.com/jpwesselink/flughafen/commit/21c4768b5432fad1659adf54ad9f2c8b47af486f))
* use pnpm publish for workspace protocol support ([868a494](https://github.com/jpwesselink/flughafen/commit/868a4943262afd173cb94cdff09f7aaae379c976))


### Features

* add callback form support to uses() method + update docs ([930d879](https://github.com/jpwesselink/flughafen/commit/930d879056208e1660cdf11372e0ed29b5f8cf28))
* Add callback-based API and fix context switching issues ([5ed13e7](https://github.com/jpwesselink/flughafen/commit/5ed13e7f11d61e3e7e443c9b6351c1155d327fa8))
* add clean:generated and regen scripts for managing generated files ([1994edb](https://github.com/jpwesselink/flughafen/commit/1994edb77a837decd8c687781e42c5596bb30c2f))
* add init command and enhance CLI configuration support ([6e412d9](https://github.com/jpwesselink/flughafen/commit/6e412d91889f2df3fc2494a080fddddeadf7e0db))
* complete migration to callback-based API with validation fixes ([86a5608](https://github.com/jpwesselink/flughafen/commit/86a56080940b43e6ceabc2c06f18568fe0234666))
* Complete refactor to unified synth() architecture with simplified CLI ([5382dbe](https://github.com/jpwesselink/flughafen/commit/5382dbe78ee85ffab8453e57d4c6a3745a4882f3))
* complete workflow name-to-filename fallback in CLI ([c2aca46](https://github.com/jpwesselink/flughafen/commit/c2aca46d3b6f7b297f3e803c311e8d473c137feb))
* enhance CLI and add CI workflow ([e573e3d](https://github.com/jpwesselink/flughafen/commit/e573e3df507298fcb0e00d7e67c334e5788b7546))
* enhance CLI with spinner support and ESM-only build ([64807c1](https://github.com/jpwesselink/flughafen/commit/64807c1c3ded30d04f980bd67514ab30a8e61c75))
* Implement clean domain separation - remove CLI from core library ([294298b](https://github.com/jpwesselink/flughafen/commit/294298bd9ca67780c3ac8e238f8efaca4f95e92b))
* implement comprehensive error handling system ([e1e90e6](https://github.com/jpwesselink/flughafen/commit/e1e90e612c8879976ba3a59fc602a7c70a0fb790))
* implement comprehensive validation system and project restructuring ([58ef525](https://github.com/jpwesselink/flughafen/commit/58ef5256c87c4d5c49f739f441b11add18587172))
* implement flexible .uses() API with both direct and callback forms ([ff2e276](https://github.com/jpwesselink/flughafen/commit/ff2e27671296e33577eed7dc3d4db5b7eb4fbfb7))
* implement generic Builder<T> interface pattern ([f1f6fee](https://github.com/jpwesselink/flughafen/commit/f1f6fee7daae418a6e533f4c19953603960b797a))
* implement local custom actions support ([78402f9](https://github.com/jpwesselink/flughafen/commit/78402f970ec7e7299e79614a5a8d33fde01ef4d3))
* implement Phase 1 of CLI package migration ([3632df7](https://github.com/jpwesselink/flughafen/commit/3632df7ec586bd3a50915a8630db2f20eed591e3))
* implement Phase 2 CLI infrastructure with config, validation, and watch ([0016edb](https://github.com/jpwesselink/flughafen/commit/0016edbf97b9048704e175e94cc33850090a6109))
* implement type-safe GitHub Actions with static analysis ([e29154a](https://github.com/jpwesselink/flughafen/commit/e29154a0808873bf10eb5f85ffafcc3641f540aa))
* implement TypeScript sandboxed execution in CLI ([6434ea3](https://github.com/jpwesselink/flughafen/commit/6434ea392b66b3691a342817b9f3cca8d62691c8))
* implement yargs CLI framework and clean exports ([a903e8d](https://github.com/jpwesselink/flughafen/commit/a903e8da2c3ffb5bf4efb9cd63ba3b33b938612b))
* migrate to pnpm monorepo with Turborepo ([e36bcdd](https://github.com/jpwesselink/flughafen/commit/e36bcddb87d27b01851376700693b58f2fc25bed))
* migrate to unified function-based TypeScript API ([9933115](https://github.com/jpwesselink/flughafen/commit/9933115367e88e24375f142799647a1cd8203e5c))
* Replace all examples with clean basic usage example ([cd7fd53](https://github.com/jpwesselink/flughafen/commit/cd7fd5326c7d7dc2c9d210732e93086f92222dd4))


### BREAKING CHANGES

* Moved CLI logic out of core flughafen package

Core Library Changes:
- Created new operations directory with pure programmatic APIs
- Added synth() function - clean workflow synthesis API
- Added generateTypes() function - clean type generation API
- Removed CLI concerns from core package exports
- Updated main index.ts to export operations as primary API

CLI Package Changes:
- Added commands directory with CLI-specific wrappers
- CLI commands now import from core operations and add console output
- Maintains full CLI functionality and user experience
- Clean separation: CLI handles presentation, core handles logic

Benefits:
- Clean separation: Core library is purely functional
- Reusable: Operations can be used by CLI, VS Code extension, web UI, etc.
- Testable: Operations are pure functions, easier to test
- Maintainable: Clear boundaries between domains
- Future-proof: Can add new frontends without touching core

All tests pass, CLI functionality preserved, cleaner architecture achieved.
* Removed TypedStepBuilder export, but functionality preserved in StepBuilder
* Removes dual API approach in favor of single modern API

- Remove all references to 'callback' and 'traditional' APIs from code and docs
- Unify under single createWorkflow() function with function-based configuration
- Replace WorkflowBuilder with unified implementation (formerly CallbackWorkflowBuilder)
- Remove obsolete builder classes: CallbackWorkflowBuilder, JobBuilder, StepBuilder, TriggerBuilder
- Update all examples to use unified API syntax
- Update README to reflect single API approach with function-based architecture
- Fix action-input-builders example to work with new API
- Remove outdated usage.ts example
- Update exports in index.ts to only expose new API
- Simplify test suite to match unified API
- Maintain full type safety and validation functionality
- All tests passing and examples working correctly

Migration complete: single, modern, type-safe, function-based API
