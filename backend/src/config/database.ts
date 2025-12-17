import { checkDatabaseConnection, disconnectDatabase, db } from '../db/client'

// Re-export database functions and client
export { checkDatabaseConnection, disconnectDatabase, db }

export default db