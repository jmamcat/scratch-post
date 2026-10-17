import type { ComponentProps } from 'react';
import { RightPane } from '../navigate/index.ts';
import { PropertiesEditor } from '../vault/index.ts';

type Props = Omit<ComponentProps<typeof RightPane>, 'properties'> & {
  onEditText: (path: string, text: string) => void;
};

/** The right pane with the properties editor, so the front-matter parser loads with the pane. */
export default function RightPaneWithProperties({ onEditText, ...props }: Props) {
  const { path } = props;
  return <RightPane {...props} properties={(t) => <PropertiesEditor text={t} onChange={(next) => path && onEditText(path, next)} />} />;
}
