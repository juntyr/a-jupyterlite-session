import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PathExt } from '@jupyterlab/coreutils';
import { BrowserStorageDrive } from '@jupyterlite/contents';
import { IDefaultDrive, Contents } from '@jupyterlab/services';
import { v4 as uuidv4 } from 'uuid';

import { IJupyterLiteSession } from './tokens';

/**
 * Initialization data for the a-jupyterlite-session extension.
 */
const plugin: JupyterFrontEndPlugin<IJupyterLiteSession> = {
  id: 'a-jupyterlite-session:plugin',
  autoStart: true,
  provides: IJupyterLiteSession,
  requires: [IDefaultDrive],
  activate: async (_app: JupyterFrontEnd, idrive: Contents.IDrive) => {
    const SESSIONS = '.sessions';
    const README = 'README.md';
    const REQUIREMENTS = 'requirements.txt';

    const drive = idrive as BrowserStorageDrive;
    await drive.ready;

    console.log('JupyterLite extension a-jupyterlite-session is activated!');

    const storage = (drive as any)._storage as LocalForage;

    const now = new Date();

    if (!(await storage.getItem(SESSIONS))) {
      await storage.setItem(SESSIONS, {
        name: SESSIONS,
        path: SESSIONS,
        last_modified: now.toISOString(),
        created: now.toISOString(),
        format: 'json',
        mimetype: '',
        content: null,
        size: 0,
        writable: true,
        type: 'directory'
      });
    }

    // Generate a '%dd-%mm-%yyyy-%hh-%mm-%ss' timestamp
    const timestamp = now
      .toLocaleDateString('en-us', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h24'
      })
      .replace(/\//g, '-')
      .replace(/:/g, '-')
      .replace(', ', '-');
    const salt = uuidv4().slice(0, 8);

    // Generate a unique session directory name with the current time and a
    //  random suffix
    const sessionPath = PathExt.join(SESSIONS, `${timestamp}-${salt}`);

    // Create the new directory
    await storage.setItem(sessionPath, {
      name: PathExt.basename(sessionPath),
      path: sessionPath,
      last_modified: now.toISOString(),
      created: now.toISOString(),
      format: 'json',
      mimetype: '',
      content: null,
      size: 0,
      writable: true,
      type: 'directory'
    });

    // If litegitpuller is used to load a repo, set its uploadpath to the
    //  session folder
    const url = new URL(window.location.href);
    if (url.searchParams.get('repo') !== null) {
      url.searchParams.set('uploadpath', sessionPath);
      window.history.replaceState(null, '', url);
    }

    // Copy the current README.md file to the new session folder, without awaiting it
    drive
      .copy(README, sessionPath)
      .catch(reason =>
        console.warn(
          `Failed to copy the ${README} file to the new session: ${reason}`
        )
      );

    // Copy the current requirements.txt file to the new session folder, without awaiting it
    drive
      .copy(REQUIREMENTS, sessionPath)
      .catch(reason =>
        console.warn(
          `Failed to copy the ${REQUIREMENTS} file to the new session: ${reason}`
        )
      );

    return { sessionPath };
  }
};

export default plugin;

export * from './tokens';
