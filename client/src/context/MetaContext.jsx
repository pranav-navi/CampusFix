import { createContext, useContext, useEffect, useState } from 'react';
import { metaApi } from '../api/services';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants';

// Enum values (categories, priorities, statuses) come from the API so the
// frontend never drifts from the backend's validation rules.
const MetaContext = createContext({ categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES });

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState({ categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES });
  useEffect(() => {
    metaApi
      .get()
      .then(({ categories, priorities, statuses }) => setMeta({ categories, priorities, statuses }))
      .catch(() => {});
  }, []);
  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
