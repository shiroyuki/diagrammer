import { deletionTargets, useGraphStore } from '../model/store';
import { Modal } from './Modal';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function ConfirmDeleteDialog() {
  const open = useGraphStore((s) => s.pendingDelete);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const { cancelDelete, confirmDelete } = useGraphStore.getState();
  const { nodeIds, edgeIds } = deletionTargets({ nodes, edges });

  const parts = [];
  if (nodeIds.size) parts.push(plural(nodeIds.size, 'node'));
  if (edgeIds.size) parts.push(plural(edgeIds.size, 'connection'));

  return (
    <Modal open={open} title="Delete selection?" onClose={cancelDelete}>
      <p>
        This will delete {parts.join(' and ') || 'the selection'}.
        {nodeIds.size > 0 && edgeIds.size > 0 && ' Connections attached to deleted nodes are removed too.'}
      </p>
      <div className="modal-actions">
        <button className="btn" data-autofocus onClick={cancelDelete}>
          Cancel
        </button>
        <button className="btn danger" onClick={confirmDelete}>
          Delete
        </button>
      </div>
    </Modal>
  );
}
