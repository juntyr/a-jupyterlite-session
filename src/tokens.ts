import { Token } from '@lumino/coreutils';

/**
 * The token for the JupyterLite session singleton.
 */
export const IJupyterLiteSession = new Token<IJupyterLiteSession>(
  'a-jupyterlite-session:IJupyterLiteSession'
);

/**
 *  An interface for the JupyterLite session singleton.
 */
export interface IJupyterLiteSession {
  sessionPath: string;
}
