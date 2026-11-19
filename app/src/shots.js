// Fixed scenes for screenshots: ?shot=cover shows the cover alone.
// `apply` receives { photo, caption, subtitle, layout, grade, titleStyle }.
// window.__shotReady is set once painted (after two animation frames).
export function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const params = {
    photo: query.get('photo') ?? 'beach',
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? '',
    layout: query.get('layout') ?? 'classic',
    grade: query.get('grade') ?? 'sunset',
    titleStyle: query.get('titleStyle') ?? 'gradient',
  };
  apply(params);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
