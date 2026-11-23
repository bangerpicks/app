import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export function initAdmin() {
  if (admin.apps.length > 0) return admin.app()
  let projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
  if (!projectId) {
    try {
      const rc = JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8'))
      projectId = rc?.projects?.default
    } catch {
      // ignore
    }
  }
  return admin.initializeApp(projectId ? { projectId } : undefined)
}

export function getDb() {
  initAdmin()
  return admin.firestore()
}