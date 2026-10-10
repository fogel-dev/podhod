import { useState } from 'react';
import { getProgram } from '@/entities/program';
import type { PlanOccurrence } from '@/entities/calendar';
import { write } from '@/shared/api';
import type { WriteContext } from '@/shared/api';
import { useAction } from '@/shared/lib/action';
import { Dialog } from '@/shared/ui/dialog';
export function ScheduleChange({
  plan,
  context,
  onChanged,
}: {
  plan: PlanOccurrence;
  context: WriteContext;
  onChanged: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState(plan.date);
  const action = useAction();
  async function change(type: 'move' | 'cancel' | 'restore') {
    const program = await getProgram(plan.programId);
    const path = `/programs/${plan.programId}/exceptions/${plan.sourceDate}`;
    if (type === 'restore')
      await write<void>(path, undefined, context, 'DELETE', program.version);
    else
      await write(
        path,
        {
          expectedVersion: program.version,
          action: type,
          ...(type === 'move' ? { targetDate: target } : {}),
        },
        context,
        'PUT',
      );
    setMoving(false);
    onChanged();
  }
  if (
    plan.status === 'started' ||
    plan.status === 'completed' ||
    plan.status === 'missed'
  )
    return null;
  return (
    <>
      <div className="actions">
        {plan.status === 'cancelled' || plan.status === 'moved' ? (
          <button
            className="text-button"
            disabled={action.busy}
            onClick={() => {
              if (window.confirm('Восстановить тренировку на исходной дате?'))
                void action.run(() => change('restore'));
            }}
          >
            Вернуть по плану
          </button>
        ) : (
          <>
            <button
              className="text-button"
              disabled={action.busy}
              onClick={() => setMoving(true)}
            >
              Перенести
            </button>
            <button
              className="text-button"
              disabled={action.busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Отменить тренировку в этот день? История сохраняется.',
                  )
                )
                  void action.run(() => change('cancel'));
              }}
            >
              Отменить день
            </button>
          </>
        )}
      </div>
      <p role="alert" className="form-message">
        {action.error}
      </p>
      {moving && (
        <Dialog
          title="Перенести тренировку"
          busy={action.busy}
          onClose={() => setMoving(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(() => change('move'));
            }}
          >
            <label className="field">
              Новая дата
              <input
                type="date"
                required
                min={plan.sourceDate}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <p className="field-hint">
              Исходная дата сохранится в календаре. Занятую дату сервер не
              позволит заменить.
            </p>
            <button
              className="primary section"
              disabled={action.busy || target === plan.sourceDate}
            >
              Перенести
            </button>
          </form>
          <p role="alert">{action.error}</p>
        </Dialog>
      )}
    </>
  );
}
