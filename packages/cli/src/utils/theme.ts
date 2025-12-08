import chalk from "chalk";

/**
 * Flughafen CLI Theme
 *
 * Airport departure board inspired styling.
 * ASCII-only symbols for maximum compatibility.
 */

// =============================================================================
// ICONS (ASCII-only for compatibility)
// =============================================================================

export const icons = {
	// Status
	success: "[ok]",
	error: "[!!]",
	warning: "[!]",
	info: "[i]",
	cross: "[!!]",

	// Progress
	arrow: ">",
	bullet: "-",
	dot: ".",

	// Table
	check: "ok",
	fail: "!!",
	pass: "ok",

	// Sections
	section: "##",
	subsection: "--",

	// Files
	file: "-",
	folder: "+",

	// Actions
	next: "->",
	target: ">>",
	watch: "~~",
} as const;

// =============================================================================
// COLORS (chalk wrappers)
// =============================================================================

export const colors = {
	// Status colors
	success: chalk.green,
	error: chalk.red,
	warning: chalk.yellow,
	info: chalk.cyan,

	// Text colors
	primary: chalk.white,
	secondary: chalk.gray,
	muted: chalk.dim,
	highlight: chalk.bold,
	bold: chalk.bold,

	// Semantic colors
	path: chalk.cyan,
	count: chalk.yellow,
	time: chalk.gray,
	header: chalk.bold,
} as const;

// =============================================================================
// FORMATTED OUTPUT HELPERS
// =============================================================================

export const fmt = {
	// Status messages
	success: (msg: string) => `${colors.success(icons.success)} ${msg}`,
	error: (msg: string) => `${colors.error(icons.error)} ${msg}`,
	warning: (msg: string) => `${colors.warning(icons.warning)} ${msg}`,
	info: (msg: string) => `${colors.info(icons.info)} ${msg}`,

	// Debug/verbose messages
	debug: (msg: string) => `${colors.muted(icons.bullet)} ${colors.muted(msg)}`,
	verbose: (msg: string) => `${colors.secondary(icons.arrow)} ${msg}`,

	// File/path messages
	file: (path: string) => `${icons.file} ${colors.path(path)}`,
	folder: (path: string) => `${icons.folder} ${colors.path(path)}`,

	// Section headers
	header: (title: string) => colors.header(title),
	subheader: (title: string) => colors.secondary(title),

	// List items
	item: (msg: string) => `  ${icons.bullet} ${msg}`,
	subitem: (msg: string) => `    ${icons.dot} ${msg}`,

	// Counts and stats
	count: (n: number, label: string) => `${colors.count(String(n))} ${label}`,
	time: (ms: number) => colors.time(`${ms}ms`),

	// Table cell values
	pass: () => colors.success(icons.pass),
	fail: (count?: number) => colors.error(count !== undefined ? String(count) : icons.fail),
	none: () => colors.muted("0"),

	// Next steps
	step: (n: number, msg: string) => `  ${colors.muted(`${n}.`)} ${msg}`,
} as const;

// =============================================================================
// SECTION BUILDERS
// =============================================================================

export const section = {
	/**
	 * Print a success completion message
	 */
	complete: (msg: string) => {
		console.log(colors.success(`${icons.success} ${msg}`));
	},

	/**
	 * Print an error message
	 */
	fail: (msg: string) => {
		console.error(colors.error(`${icons.error} ${msg}`));
	},

	/**
	 * Print a warning message
	 */
	warn: (msg: string) => {
		console.warn(colors.warning(`${icons.warning} ${msg}`));
	},

	/**
	 * Print section header
	 */
	header: (title: string) => {
		console.log();
		console.log(colors.header(title));
	},

	/**
	 * Print next steps
	 */
	nextSteps: (steps: string[]) => {
		console.log();
		console.log(colors.header("Next Steps:"));
		steps.forEach((step, i) => {
			console.log(fmt.step(i + 1, step));
		});
	},

	/**
	 * Print output location
	 */
	outputLocation: (dir: string, subdirs: { name: string; count: number }[]) => {
		console.log();
		console.log(`${colors.info(icons.folder)} Output: ${colors.highlight(dir)}/`);
		for (const sub of subdirs) {
			const suffix = sub.count > 1 ? "s" : "";
			console.log(colors.secondary(`   ${icons.file} ${sub.name}/ (${sub.count} file${suffix})`));
		}
	},

	/**
	 * Print file list (for verbose mode)
	 */
	fileList: (label: string, files: string[]) => {
		console.log(`${colors.muted(icons.bullet)} ${label}:`);
		for (const file of files) {
			console.log(`   ${colors.muted(icons.bullet)} ${colors.path(file)}`);
		}
	},

	/**
	 * Print details for failures
	 */
	details: (title: string, items: { label: string; messages: string[] }[]) => {
		console.log();
		console.log(colors.header(title));
		for (const item of items) {
			console.log();
			console.log(colors.error(item.label));
			for (const msg of item.messages) {
				console.log(colors.error(`  ${icons.bullet} ${msg}`));
			}
		}
	},
} as const;
