import type { UiIntent } from '../../presentation';

export type IntentMonitorProps = {
  intent: UiIntent | null;
};

function getPayload(intent: UiIntent) {
  switch (intent.type) {
    case 'composer.submit':
      return { content: intent.content };
    case 'permission.approve':
    case 'permission.deny':
      return { toolCallId: intent.toolCallId };
    case 'run.stop':
      return {};
  }
}

export function IntentMonitor({ intent }: IntentMonitorProps) {
  return (
    <section aria-label="最近界面意图">
      <h2>最近界面意图</h2>
      <div aria-live="polite" role="status">
        {intent ? (
          <>
            <strong>{intent.type}</strong>
            <pre aria-label="界面意图参数">{JSON.stringify(getPayload(intent))}</pre>
          </>
        ) : (
          <p>暂无界面意图</p>
        )}
      </div>
    </section>
  );
}
