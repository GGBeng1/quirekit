import type { PreviewProps } from "./types";

/** @param props - Retained preview inputs. @param offset - Exact unchanged source displacement.
 * @returns Relocated source intent for later mounts; the renderer body and resource remain unchanged. */
export function mapPreviewProps(props: PreviewProps, offset: number): PreviewProps {
  return { ...props, range: { from: props.range.from + offset, to: props.range.to + offset } };
}
