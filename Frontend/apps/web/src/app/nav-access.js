import { can } from '@swams/permissions';

/**
 * Access state for one nav item (Section 4.1):
 *  - 'hidden'   feature not released yet, or no permission (never show empty entries)
 *  - 'locked'   released + permitted, but the org entitlement is missing →
 *               render as an upgrade affordance, never a dead link
 *  - 'allowed'  render as a normal link
 *
 * @param {{ enabled?: boolean, requires?: { permission?: string, entitlement?: string } }} item
 * @param {import('@swams/permissions').Principal | null} principal
 * @param {string[]} [entitlements] org entitlements from the session
 * @returns {'hidden'|'locked'|'allowed'}
 */
export function navState(item, principal, entitlements = []) {
  if (!item.enabled) return 'hidden';
  const permission = item.requires?.permission;
  if (permission && !can(principal, permission)) return 'hidden';
  const entitlement = item.requires?.entitlement;
  if (entitlement && !entitlements.includes(entitlement)) return 'locked';
  return 'allowed';
}

/**
 * Visible items grouped by the sidebar groups (Section 8.5); groups that end up
 * empty are removed so the sidebar never shows a label with nothing under it.
 *
 * @param {Array<object>} items
 * @param {object|null} principal
 * @param {string[]} [entitlements]
 * @returns {Array<{ id: string, labelKey: string, items: Array<object> }>}
 */
export function visibleGroups(items, principal, entitlements = []) {
  const groups = [];
  for (const item of items) {
    if (!item.group) continue;
    const state = navState(item, principal, entitlements);
    if (state === 'hidden') continue;
    let bucket = groups.find((g) => g.id === item.group);
    if (!bucket) {
      bucket = { id: item.group, labelKey: `nav.${item.group}`, items: [] };
      groups.push(bucket);
    }
    bucket.items.push({ ...item, access: state });
  }
  return groups;
}

/**
 * Mobile bottom tabs (Section 8.4: Home, Attendance, Work, Leave, More),
 * ordered and filtered the same way as the sidebar.
 */
export function mobileTabs(items, principal, entitlements = []) {
  return items
    .filter((item) => item.mobile?.tab && navState(item, principal, entitlements) !== 'hidden')
    .sort((a, b) => a.mobile.order - b.mobile.order)
    .map((item) => ({ ...item, access: navState(item, principal, entitlements) }));
}
