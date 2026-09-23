/**
 * "Today", or "Mon, Sep 21", with the year added when it is not this one.
 * American English, like the rest of the copy. Days are local days, because
 * that is what "today" means to the person holding the phone.
 */
export function formatSavedDate(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  if (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate()
  ) {
    return 'Today';
  }
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  if (created.getFullYear() !== now.getFullYear()) options.year = 'numeric';
  return new Intl.DateTimeFormat('en-US', options).format(created);
}
