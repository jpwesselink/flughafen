import ora, { type Ora } from "ora";
import chalk from "chalk";

/**
 * Enhanced spinner utility with predefined styles and messages
 */
export class SpinnerManager {
	private spinner: Ora | null = null;
	private silent: boolean;

	constructor(silent = false) {
		this.silent = silent;
	}

	/**
	 * Start a spinner with a message
	 */
	start(message: string, options?: { color?: string }): void {
		if (this.silent) return;

		this.spinner = ora({
			text: message,
			color: options?.color as any || "blue"
		}).start();
	}

	/**
	 * Update the spinner message
	 */
	update(message: string): void {
		if (this.silent || !this.spinner) return;
		this.spinner.text = message;
	}

	/**
	 * Mark spinner as successful and stop
	 */
	succeed(message?: string): void {
		if (this.silent || !this.spinner) return;
		this.spinner.succeed(message);
		this.spinner = null;
	}

	/**
	 * Mark spinner as failed and stop
	 */
	fail(message?: string): void {
		if (this.silent || !this.spinner) return;
		this.spinner.fail(message);
		this.spinner = null;
	}

	/**
	 * Mark spinner as warning and stop
	 */
	warn(message?: string): void {
		if (this.silent || !this.spinner) return;
		this.spinner.warn(message);
		this.spinner = null;
	}

	/**
	 * Stop spinner with info symbol
	 */
	info(message?: string): void {
		if (this.silent || !this.spinner) return;
		this.spinner.info(message);
		this.spinner = null;
	}

	/**
	 * Stop spinner without symbol
	 */
	stop(): void {
		if (this.silent || !this.spinner) return;
		this.spinner.stop();
		this.spinner = null;
	}

	/**
	 * Check if spinner is currently running
	 */
	isSpinning(): boolean {
		return this.spinner !== null && this.spinner.isSpinning;
	}
}

/**
 * Predefined spinner operations for common CLI tasks
 */
export class CliSpinners {
	private manager: SpinnerManager;

	constructor(silent = false) {
		this.manager = new SpinnerManager(silent);
	}

	/**
	 * Spinner for file operations
	 */
	async file<T>(operation: () => Promise<T>, options: {
		loading: string;
		success: string;
		error?: string;
	}): Promise<T> {
		this.manager.start(options.loading, { color: "cyan" });
		
		try {
			const result = await operation();
			this.manager.succeed(options.success);
			return result;
		} catch (error) {
			const errorMsg = options.error || "Operation failed";
			this.manager.fail(errorMsg);
			throw error;
		}
	}

	/**
	 * Spinner for build/compilation operations
	 */
	async build<T>(operation: () => Promise<T>, options: {
		loading: string;
		success: string;
		error?: string;
	}): Promise<T> {
		this.manager.start(options.loading, { color: "yellow" });
		
		try {
			const result = await operation();
			this.manager.succeed(options.success);
			return result;
		} catch (error) {
			const errorMsg = options.error || "Build failed";
			this.manager.fail(errorMsg);
			throw error;
		}
	}

	/**
	 * Spinner for validation operations
	 */
	async validate<T>(operation: () => Promise<T>, options: {
		loading: string;
		success: string;
		error?: string;
	}): Promise<T> {
		this.manager.start(options.loading, { color: "magenta" });
		
		try {
			const result = await operation();
			this.manager.succeed(options.success);
			return result;
		} catch (error) {
			const errorMsg = options.error || "Validation failed";
			this.manager.fail(errorMsg);
			throw error;
		}
	}

	/**
	 * Spinner for network operations
	 */
	async network<T>(operation: () => Promise<T>, options: {
		loading: string;
		success: string;
		error?: string;
	}): Promise<T> {
		this.manager.start(options.loading, { color: "blue" });
		
		try {
			const result = await operation();
			this.manager.succeed(options.success);
			return result;
		} catch (error) {
			const errorMsg = options.error || "Network operation failed";
			this.manager.fail(errorMsg);
			throw error;
		}
	}

	/**
	 * Access to raw spinner manager for custom operations
	 */
	get raw(): SpinnerManager {
		return this.manager;
	}
}

/**
 * Enhanced logging utilities
 */
export class Logger {
	private silent: boolean;
	private verbose: boolean;

	constructor(silent = false, verbose = false) {
		this.silent = silent;
		this.verbose = verbose;
	}

	/**
	 * Log success message
	 */
	success(message: string): void {
		if (this.silent) return;
		console.log(chalk.green(`✅ ${message}`));
	}

	/**
	 * Log error message
	 */
	error(message: string): void {
		if (this.silent) return;
		console.error(chalk.red(`❌ ${message}`));
	}

	/**
	 * Log warning message
	 */
	warn(message: string): void {
		if (this.silent) return;
		console.warn(chalk.yellow(`⚠️  ${message}`));
	}

	/**
	 * Log info message
	 */
	info(message: string): void {
		if (this.silent) return;
		console.log(chalk.blue(`ℹ️  ${message}`));
	}

	/**
	 * Log debug message (only in verbose mode)
	 */
	debug(message: string): void {
		if (this.silent || !this.verbose) return;
		console.log(chalk.gray(`🔧 ${message}`));
	}

	/**
	 * Log step message
	 */
	step(message: string): void {
		if (this.silent) return;
		console.log(chalk.cyan(`📋 ${message}`));
	}

	/**
	 * Log completion message
	 */
	complete(message: string): void {
		if (this.silent) return;
		console.log(chalk.green(`🎉 ${message}`));
	}

	/**
	 * Log plain message (respects silent mode)
	 */
	log(message: string): void {
		if (this.silent) return;
		console.log(message);
	}
}