// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// keeps the full editor chrome. `apply` receives
// { photo, caption, subtitle, layout, grade, titleStyle } and paints the scene;
// window.__shotReady is set once painted (after two animation frames), which is
// what the screenshot run waits on before capturing.
export function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  // Defaults keep the editor opening on a sane scene when a param is missing.
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
