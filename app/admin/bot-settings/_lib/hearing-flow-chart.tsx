'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type FlowStepType = 'ask' | 'show_cards' | 'proposal_meeting' | 'show_closing';

export type FlowStep = {
  id: string;
  type: FlowStepType;
  prompt?: string;
  branches?: Array<{
    condition: {
      type: 'keyword' | 'sentiment' | 'default';
      value?: string[];
      sentiment?: 'positive' | 'negative' | 'neutral';
    };
    goToStepId: string;
  }>;
  skipIf?: { type: 'already_answered'; matchKeys?: string[] };
  position?: { x: number; y: number };
};

const COLORS: Record<FlowStepType, { bg: string; border: string; emoji: string; label: string }> = {
  ask: { bg: '#eef2ff', border: '#6366f1', emoji: '💬', label: '質問する' },
  show_cards: { bg: '#f5f3ff', border: '#a855f7', emoji: '🎴', label: 'カード提示' },
  proposal_meeting: { bg: '#fdf4ff', border: '#d946ef', emoji: '🎯', label: '商談誘導' },
  show_closing: { bg: '#ecfdf5', border: '#10b981', emoji: '✅', label: 'クロージング' },
};

type StepNodeData = { step: FlowStep; index: number };

function StepNode({ data, selected }: { data: StepNodeData; selected?: boolean }) {
  const { step, index } = data;
  const c = COLORS[step.type];
  return (
    <div
      style={{
        background: c.bg,
        border: `2px solid ${selected ? '#0f172a' : c.border}`,
        borderRadius: 12,
        padding: 10,
        width: 220,
        boxShadow: selected ? '0 4px 14px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.08)',
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: c.border, width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#64748b',
            background: '#fff',
            borderRadius: 99,
            padding: '1px 6px',
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {index + 1}
        </span>
        <span style={{ fontSize: 16 }}>{c.emoji}</span>
        <span style={{ fontWeight: 700, color: '#334155' }}>{c.label}</span>
      </div>
      {step.type === 'ask' && step.prompt ? (
        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3, wordBreak: 'break-word' }}>
          {step.prompt.length > 70 ? step.prompt.slice(0, 70) + '…' : step.prompt}
        </div>
      ) : step.type === 'ask' ? (
        <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>（プロンプト未設定）</div>
      ) : null}
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {Array.isArray(step.branches) && step.branches.length > 0 && (
          <span style={{ fontSize: 10, color: c.border, fontWeight: 700 }}>🔀 {step.branches.length}件の分岐</span>
        )}
        {step.skipIf && (
          <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 700 }}>🔎 条件スキップ</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: c.border, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { step: StepNode as any };

const buildNodes = (steps: FlowStep[]): Node<StepNodeData>[] =>
  steps.map((s, i) => ({
    id: s.id,
    type: 'step',
    position: s.position || { x: 80, y: i * 160 },
    data: { step: s, index: i },
  }));

const buildEdges = (steps: FlowStep[]): Edge[] => {
  const result: Edge[] = [];
  const ids = new Set(steps.map((s) => s.id));
  steps.forEach((s, i) => {
    const branches = Array.isArray(s.branches) ? s.branches : [];
    const validBranches = branches.filter((b) => ids.has(b.goToStepId));
    if (validBranches.length > 0) {
      validBranches.forEach((br, bi) => {
        let label = '';
        if (br.condition.type === 'keyword') {
          const kws = (br.condition.value || []).filter(Boolean);
          label = kws.length ? kws.slice(0, 2).join(' / ') + (kws.length > 2 ? '…' : '') : '（未設定）';
        } else if (br.condition.type === 'default') {
          label = 'その他';
        } else if (br.condition.type === 'sentiment') {
          label = `感情: ${br.condition.sentiment || ''}`;
        }
        result.push({
          id: `${s.id}-br${bi}`,
          source: s.id,
          target: br.goToStepId,
          label,
          animated: true,
          style: { stroke: COLORS[s.type].border, strokeWidth: 2 },
          labelStyle: { fontSize: 10, fontWeight: 700, fill: '#334155' },
          labelBgStyle: { fill: '#ffffff' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        });
      });
    } else if (i < steps.length - 1) {
      result.push({
        id: `${s.id}-seq`,
        source: s.id,
        target: steps[i + 1].id,
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });
    }
  });
  return result;
};

export function HearingFlowChart({
  steps,
  onStepsChange,
  onSelectStep,
}: {
  steps: FlowStep[];
  onStepsChange: (next: FlowStep[]) => void;
  onSelectStep?: (stepId: string | null) => void;
}) {
  const initialNodes = useMemo(() => buildNodes(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialEdges = useMemo(() => buildEdges(steps), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>(initialNodes as Node<StepNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // 親 steps が変わったら内部状態も更新（削除/追加/内容変更）
  useEffect(() => {
    setNodes(buildNodes(steps) as Node<StepNodeData>[]);
    setEdges(buildEdges(steps));
  }, [steps, setNodes, setEdges]);

  const handleNodeDragStop = useCallback(
    (_e: any, node: Node) => {
      onStepsChange(
        steps.map((s) =>
          s.id === node.id ? { ...s, position: { x: node.position.x, y: node.position.y } } : s,
        ),
      );
    },
    [steps, onStepsChange],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }: { nodes: Node[] }) => {
      if (!onSelectStep) return;
      onSelectStep(selNodes[0]?.id ?? null);
    },
    [onSelectStep],
  );

  return (
    <div
      style={{
        width: '100%',
        height: 600,
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onSelectionChange={handleSelectionChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const data = n.data as StepNodeData | undefined;
              return data ? COLORS[data.step.type].border : '#cbd5e1';
            }}
            maskColor="rgba(248,250,252,0.6)"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
