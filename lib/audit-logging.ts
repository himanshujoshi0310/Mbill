import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuditLogEntry {
  id?: string
  userId: string
  traderId: string
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorMessage?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface AuditLogQuery {
  userId?: string
  traderId?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  success?: boolean
  limit?: number
  offset?: number
}

class AuditLogger {
  private enabled: boolean

  constructor() {
    this.enabled = process.env.AUDIT_LOGGING_ENABLED === 'true'
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    if (!this.enabled) {
      return
    }

    try {
      const auditEntry = {
        ...entry,
        timestamp: new Date(),
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null
      }

      // In production, this would be stored in a dedicated audit_logs table
      // For now, we'll store in memory and could extend to database or external service
      if (process.env.NODE_ENV === 'development') {
        console.log('AUDIT LOG:', auditEntry)
      }

      // Future implementation: Save to database
      // await prisma.auditLog.create({ data: auditEntry })

      // Future implementation: Send to external logging service
      // await this.sendToLogService(auditEntry)

    } catch (error) {
      // Audit logging should never break the application
      if (process.env.NODE_ENV === 'development') {
        console.error('Audit logging error:', error)
      }
    }
  }

  async logAuthentication(
    userId: string,
    traderId: string,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'TOKEN_REFRESH',
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      userId,
      traderId,
      action,
      resource: 'AUTHENTICATION',
      success: action.includes('SUCCESS') || action === 'LOGOUT' || action === 'TOKEN_REFRESH',
      ipAddress,
      userAgent,
      errorMessage
    })
  }

  async logDataAccess(
    userId: string,
    traderId: string,
    resource: string,
    resourceId: string,
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      traderId,
      action: `${action}_${resource}`,
      resource,
      resourceId,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      metadata
    })
  }

  async logSecurityEvent(
    userId: string,
    traderId: string,
    event: 'BRUTE_FORCE_DETECTED' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'CAPTCHA_REQUIRED',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      traderId,
      action: event,
      resource: 'SECURITY',
      success: false, // Security events are typically negative events
      ipAddress,
      userAgent,
      metadata
    })
  }

  async logAdminAction(
    userId: string,
    traderId: string,
    action: string,
    resource: string,
    resourceId?: string,
    success: boolean = true,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      traderId,
      action: `ADMIN_${action}`,
      resource,
      resourceId,
      success,
      metadata
    })
  }

  async queryLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    // This would query the audit_logs table in production
    // For now, return empty array as placeholder
    return []
  }

  async exportLogs(query: AuditLogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.queryLogs(query)
    
    if (format === 'csv') {
      const headers = ['timestamp', 'userId', 'traderId', 'action', 'resource', 'resourceId', 'ipAddress', 'success', 'errorMessage']
      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        log.userId,
        log.traderId,
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
        log.success.toString(),
        log.errorMessage || ''
      ])
      
      return [headers, ...csvRows].map(row => row.join(',')).join('\n')
    }
    
    return JSON.stringify(logs, null, 2)
  }

  private async sendToLogService(entry: any): Promise<void> {
    // Integration with external logging services like:
    // - Elasticsearch
    // - Splunk
    // - Datadog
    // - CloudWatch Logs
    // - Custom SIEM system
    
    if (process.env.LOG_SERVICE_URL) {
      try {
        await fetch(process.env.LOG_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LOG_SERVICE_TOKEN || ''}`
          },
          body: JSON.stringify(entry)
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to send to log service:', error)
        }
      }
    }
  }

  // Compliance and retention methods
  async getComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const logs = await this.queryLogs({
      startDate,
      endDate,
      limit: 10000
    })

    return {
      period: { startDate, endDate },
      totalEvents: logs.length,
      authenticationEvents: logs.filter(log => log.resource === 'AUTHENTICATION').length,
      dataAccessEvents: logs.filter(log => log.resource !== 'AUTHENTICATION' && log.resource !== 'SECURITY').length,
      securityEvents: logs.filter(log => log.resource === 'SECURITY').length,
      adminActions: logs.filter(log => log.action.startsWith('ADMIN_')).length,
      failedEvents: logs.filter(log => !log.success).length,
      uniqueUsers: new Set(logs.map(log => log.userId)).size,
      uniqueTraders: new Set(logs.map(log => log.traderId)).size
    }
  }

  async cleanupOldLogs(retentionDays: number = 365): Promise<void> {
    // Implementation for log retention policy
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // In production: DELETE FROM audit_logs WHERE timestamp < cutoffDate
    if (process.env.NODE_ENV === 'development') {
      console.log(`Would clean up logs older than ${cutoffDate.toISOString()}`)
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger()

// Middleware helper for automatic logging
export function createAuditMiddleware() {
  return async (request: any, response: any, next: any) => {
    const startTime = Date.now()
    const userAgent = request.headers.get('user-agent')
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Override response methods to capture response
    const originalSend = response.send
    response.send = function(body: any) {
      const endTime = Date.now()
      const duration = endTime - startTime

      // Log the request/response
      if (request.user) {
        auditLogger.logDataAccess(
          request.user.userId,
          request.user.traderId,
          request.nextUrl.pathname,
          'unknown',
          'READ',
          response.statusCode < 400,
          ipAddress,
          userAgent,
          undefined,
          { duration, statusCode: response.statusCode }
        )
      }

      return originalSend.call(this, body)
    }

    next()
  }
}

// Schedule cleanup job (runs daily)
if (process.env.AUDIT_LOGGING_ENABLED === 'true') {
  setInterval(() => {
    auditLogger.cleanupOldLogs(parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365'))
  }, 24 * 60 * 60 * 1000) // Daily
}
