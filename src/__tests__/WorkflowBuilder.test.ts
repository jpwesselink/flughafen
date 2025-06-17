import { describe, it, expect } from 'vitest';
import { createWorkflow } from '../lib/builders/WorkflowBuilder';

describe('WorkflowBuilder', () => {
  it('should create a simple workflow', () => {
    const workflow = createWorkflow()
      .name('Test Workflow')
      .onPush({ branches: ['main'] })
      .job('test', job => job
        .runsOn('ubuntu-latest')
        .step(step => step.checkout())
      );

    const config = workflow.build();
    expect(config.name).toBe('Test Workflow');
    expect(config.on).toEqual({ push: { branches: ['main'] } });
    expect(config.jobs.test).toBeDefined();
  });

  it('should generate valid YAML', () => {
    const workflow = createWorkflow()
      .name('YAML Test')
      .onPush({ branches: ['main'] })
      .job('test', job => job
        .runsOn('ubuntu-latest')
        .step(step => step.checkout())
      );

    const yaml = workflow.toYAML();
    expect(yaml).toContain('name: YAML Test');
    expect(yaml).toContain('runs-on: ubuntu-latest');
  });
});
