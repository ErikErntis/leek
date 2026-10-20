import { MapPin } from 'lucide-react';
import styles from './region-notice.module.css';

export function RegionNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`${styles.notice} ${compact ? styles.compact : ''}`} aria-label="Piirkondlik tingimus">
      <MapPin size={compact ? 17 : 22} aria-hidden="true" />
      <div>
        {!compact && <strong>Loode-Eesti ettevõtetele</strong>}
        <p>{compact
          ? 'Ettevõtte saab lisada ainult juhul, kui see tegutseb Loode-Eestis.'
          : 'LEEKi ettevõtluskeskkond on mõeldud ainult Loode-Eestis tegutsevatele ettevõtetele.'}</p>
      </div>
    </aside>
  );
}
