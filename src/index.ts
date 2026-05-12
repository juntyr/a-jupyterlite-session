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

    const LOCKFILE = 'pyodideKernelLockFileURL';
    const IGNORE_PACKAGES = [
      'jupyterlite-cors', // climet-eu/lab implementation detail
      'micropip', // pyodide implementation detail
      'pyodide-http', // pyodide implementation detail
      'ipykernel' // JupyterLite provides this package
    ];

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

    const lockfileUrlParam = new URL(window.location.href).searchParams.get(
      LOCKFILE
    );
    if (lockfileUrlParam === null) {
      // Copy the current requirements.txt file to the new session folder,
      //  without awaiting it
      drive
        .copy(REQUIREMENTS, sessionPath)
        .catch(reason =>
          console.warn(
            `Failed to copy the ${REQUIREMENTS} file to the new session: ${reason}`
          )
        );
    } else {
      // Fetch the Pyodide lockfile to dynamically create the requirements.txt
      //  file in the new session folder
      async function createRequirementsFileFromPyodideLockfile() {
        let lockfileUrl: string;
        try {
          // @ts-ignore
          lockfileUrl = JSON.parse(lockfileUrlParam);
        } catch (reason) {
          console.warn(`Invalid Pyodide lockfile URL: ${reason}`);
          return;
        }

        let lock;
        try {
          const response = await fetch(lockfileUrl, {
            mode: 'cors',
            credentials: 'omit'
          });
          lock = await response.json();
        } catch (reason) {
          console.warn(`Failed to load the Pyodide lockfile: ${reason}`);
          return;
        }

        let requirementsText;
        try {
          const python = lock['info']['python'];
          const abi = lock['packages']['numpy']?.['file_name']
            ?.split('-')
            ?.pop()
            ?.slice(0, -'_wasm32.whl'.length);

          const packageKeys = new Array();
          const packageVersions = new Map();

          for (const package__ of Object.values(lock['packages'])) {
            const package_: any = package__;

            if (package_['package_type'] != 'package') {
              continue;
            }
            if (!package_['file_name'].endsWith('.whl')) {
              continue;
            }
            if (package_['install_dir'] != 'site') {
              continue;
            }

            if (IGNORE_PACKAGES.includes(package_['name'])) {
              continue;
            }

            const key = package_['name'].toLowerCase();

            packageKeys.push(key);
            packageVersions.set(key, {
              name: package_['name'],
              version: package_['version']
            });
          }

          const requirements = new Array();
          requirements.push(
            '# ========== Online Laboratory for Climate Science and Meteorology =========== #'
          );
          requirements.push(
            '#                                                                              #'
          );
          requirements.push(
            '#                               requirements.txt                               #'
          );
          requirements.push(
            '#                        for a custom Pyodide lockfile                         #'
          );
          requirements.push(
            '#                                                                              #'
          );
          requirements.push(
            '#    This list contains the locked versions of all pre-installed packages.     #'
          );
          requirements.push(
            '# ============================================================================ #'
          );
          requirements.push('');
          requirements.push(`# python == ${python}`);
          if (abi !== undefined) {
            requirements.push(`# abi == ${abi}`);
          }
          requirements.push('');
          for (const key of packageKeys.sort()) {
            const { name, version } = packageVersions.get(key);
            requirements.push(`${name} == ${version}`);
          }
          requirements.push('');

          requirementsText = requirements.join('\n');
        } catch (reason) {
          console.warn(
            `Failed to compute the ${REQUIREMENTS} file from the Pyodide lockfile: ${reason}`
          );
          return;
        }

        try {
          const requirementsPath = PathExt.join(sessionPath, REQUIREMENTS);

          await drive.save(requirementsPath, {
            name: REQUIREMENTS,
            path: requirementsPath,
            last_modified: now.toISOString(),
            created: now.toISOString(),
            format: 'text',
            mimetype: 'text/plain',
            content: requirementsText,
            size: new Blob([requirementsText]).size,
            writable: false,
            type: 'file'
          });
        } catch (reason) {
          console.warn(
            `Failed to save the ${REQUIREMENTS} file for the new session: ${reason}`
          );
        }
      }
      // do not await the creation of the requirements file
      createRequirementsFileFromPyodideLockfile();
    }

    return { sessionPath };
  }
};

export default plugin;

export * from './tokens';
