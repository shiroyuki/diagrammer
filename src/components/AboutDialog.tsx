import { APP_INFO } from '../appInfo';
import { useGraphStore } from '../model/store';
import { Modal } from './Modal';

export function AboutDialog() {
  const open = useGraphStore((s) => s.aboutOpen);
  const close = () => useGraphStore.getState().setAboutOpen(false);

  return (
    <Modal open={open} title={`About ${APP_INFO.name}`} onClose={close}>
      <dl className="about">
        <dt>Name</dt>
        <dd>{APP_INFO.name}</dd>
        <dt>Version</dt>
        <dd>{APP_INFO.version}</dd>
        <dt>License</dt>
        <dd>{APP_INFO.license}</dd>
      </dl>
      {APP_INFO.author && <p className="muted">Copyright © {APP_INFO.author}</p>}
      <div className="modal-actions">
        <button className="btn primary" data-autofocus onClick={close}>
          Close
        </button>
      </div>
    </Modal>
  );
}
