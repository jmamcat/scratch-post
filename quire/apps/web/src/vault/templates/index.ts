export { DEFAULT_TEMPLATE_FOLDER, TEMPLATE_FOLDER_PREF, templateFolder, templatePaths } from './template-folder.ts';
export { TemplatePicker } from './TemplatePicker.tsx';
/** Template insertion pulls in the editor's helpers: load it on first use, not with the app shell. */
export const loadTemplateActions = () => import('./apply.ts');
