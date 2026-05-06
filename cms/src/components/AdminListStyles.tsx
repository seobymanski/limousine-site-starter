import React from 'react'

const css = `
.collection-list,
.collection-list__wrap {
  position: relative;
}

/* Pin the bulk-actions toolbar to the right side of the Search / Columns /
   Filters controls bar, so it never overlaps the column headers row below. */
.collection-list .list-selection {
  position: absolute;
  left: 56px;
  top: 140px;
  margin: 0;
  z-index: 5;
  background: transparent;
  padding: 0;
  border: 0;
}

.collection-list .list-controls {
  min-height: 36px;
}
`

const AdminListStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: css }} />
)

export default AdminListStyles
