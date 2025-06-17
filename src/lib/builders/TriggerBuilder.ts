import type {
  PushConfig,
  PullRequestConfig,
  WorkflowInputs,
  WorkflowCallConfig
} from '../../types/builder-types';
import { WorkflowBuilder } from './WorkflowBuilder';

/**
 * TriggerBuilder for creating complex GitHub Actions workflow trigger configurations
 */
export class TriggerBuilder {
  private triggers: any = {};

  constructor(private workflowBuilder: WorkflowBuilder) {}

  /**
   * Add push trigger
   */
  push(config?: Partial<PushConfig>): TriggerBuilder {
    this.triggers.push = config || null;
    return this;
  }

  /**
   * Add pull request trigger
   */
  pullRequest(config?: Partial<PullRequestConfig>): TriggerBuilder {
    this.triggers.pull_request = config || null;
    return this;
  }

  /**
   * Add schedule trigger
   */
  schedule(cron: string): TriggerBuilder {
    if (!this.triggers.schedule) {
      this.triggers.schedule = [];
    }
    this.triggers.schedule.push({ cron });
    return this;
  }

  /**
   * Add workflow dispatch trigger
   */
  workflowDispatch(inputs?: WorkflowInputs): TriggerBuilder {
    this.triggers.workflow_dispatch = inputs ? { inputs } : {};
    return this;
  }

  /**
   * Add workflow call trigger
   */
  workflowCall(config?: WorkflowCallConfig): TriggerBuilder {
    this.triggers.workflow_call = config || {};
    return this;
  }

  /**
   * Add issues trigger
   */
  onIssues(types?: string[]): TriggerBuilder {
    this.triggers.issues = types ? { types } : {};
    return this;
  }

  /**
   * Add release trigger
   */
  onRelease(types?: string[]): TriggerBuilder {
    this.triggers.release = types ? { types } : {};
    return this;
  }

  /**
   * Add fork trigger
   */
  onFork(): TriggerBuilder {
    this.triggers.fork = {};
    return this;
  }

  /**
   * Add watch trigger
   */
  onWatch(): TriggerBuilder {
    this.triggers.watch = {};
    return this;
  }

  /**
   * Add create trigger
   */
  onCreate(): TriggerBuilder {
    this.triggers.create = {};
    return this;
  }

  /**
   * Add delete trigger
   */
  onDelete(): TriggerBuilder {
    this.triggers.delete = {};
    return this;
  }

  /**
   * Return to workflow builder
   */
  workflow(): WorkflowBuilder {
    this.workflowBuilder.addTriggerConfig(this.triggers);
    return this.workflowBuilder;
  }

  /**
   * Build the trigger configuration
   */
  build(): any {
    return this.triggers;
  }
}
