import { Component, input } from '@angular/core';
import { NgDiagramPortComponent, type NgDiagramNodeTemplate, type SimpleNode } from 'ng-diagram';
import { StepId } from './communication.component';

@Component({
  selector: 'app-step-node',
  standalone: true,
  imports: [NgDiagramPortComponent],
  template: `
    <div 
      class="step-node"
      [class.step-pending]="getState() === 'PENDING'"
      [class.step-running]="getState() === 'RUNNING'"
      [class.step-done]="getState() === 'DONE'"
      [class.step-failed]="getState() === 'FAILED'"
    >
      <div class="step-label">{{ node().data.label }}</div>
      <div class="step-state">{{ getState() }}</div>
      <ng-diagram-port id="input" side="left" type="target"></ng-diagram-port>
      <ng-diagram-port id="output" side="right" type="source"></ng-diagram-port>
    </div>
  `,
  styles: [
    `
      .step-node {
        background: #ffffff;
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 16px;
        min-width: 160px;
        min-height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;
        transition: all 0.2s ease;
      }

      .step-node.step-pending {
        background: #ffffff;
        border-color: #ddd;
        color: #666;
      }

      .step-node.step-running {
        background: #fff7e6;
        border-color: #ffb020;
        color: #d48806;
      }

      .step-node.step-done {
        background: #eaffea;
        border-color: #3bb54a;
        color: #237804;
      }

      .step-node.step-failed {
        background: #ffeaea;
        border-color: #e23b3b;
        color: #a8071a;
      }

      .step-label {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .step-state {
        font-size: 12px;
        opacity: 0.8;
        text-transform: uppercase;
      }
    `,
  ],
})
export class StepNodeComponent implements NgDiagramNodeTemplate<{ step: StepId; label: string; state?: 'RUNNING' | 'DONE' | 'FAILED' | 'PENDING' }> {
  node = input.required<SimpleNode<{ step: StepId; label: string; state?: 'RUNNING' | 'DONE' | 'FAILED' | 'PENDING' }>>();

  getState(): 'RUNNING' | 'DONE' | 'FAILED' | 'PENDING' {
    return this.node().data.state || 'PENDING';
  }
}

