import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received payment body:', JSON.stringify(body, null, 2))

    const {
      companyId,
      billType,
      billId,
      payDate,
      amount,
      mode,
      txnRef,
      note
    } = body

    // Validate required fields
    if (!companyId || !billType || !billId || !payDate || !amount || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('Recording payment for bill:', billId, 'type:', billType)

    // Get bill details
    let bill
    if (billType === 'purchase') {
      bill = await prisma.purchaseBill.findFirst({
        where: { id: billId, companyId },
        include: { farmer: true }
      })
    } else {
      bill = await prisma.salesBill.findFirst({
        where: { id: billId, companyId },
        include: { party: true }
      })
    }

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        companyId,
        billType,
        billId,
        billDate: bill.billDate, // Use bill's date
        payDate: new Date(payDate),
        amount: parseFloat(amount),
        mode,
        txnRef: txnRef || null,
        note: note || null
      }
    })

    console.log('Payment recorded:', payment.id)

    // Update bill amounts
    const currentPaid = billType === 'purchase' ? (bill as any).paidAmount : (bill as any).receivedAmount
    const newPaid = currentPaid + parseFloat(amount)
    const newBalance = (bill as any).totalAmount - newPaid
    const newStatus = newBalance === 0 ? 'paid' : newBalance === (bill as any).totalAmount ? 'unpaid' : 'partial'

    if (billType === 'purchase') {
      await prisma.purchaseBill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          status: newStatus
        }
      })
    } else {
      await prisma.salesBill.update({
        where: { id: billId },
        data: {
          receivedAmount: newPaid,
          balanceAmount: newBalance,
          status: newStatus
        }
      })
    }

    console.log('Bill updated with new payment')

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error('Error recording payment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const billType = searchParams.get('billType')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    let whereClause: any = { companyId }
    if (billType) {
      whereClause.billType = billType
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        party: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Enhance payment data with bill information
    const enhancedPayments = await Promise.all(payments.map(async (payment) => {
      let billNo = ''
      let partyName = payment.party?.name || ''

      if (payment.billType === 'purchase') {
        const purchaseBill = await prisma.purchaseBill.findUnique({
          where: { id: payment.billId },
          select: { billNo: true }
        })
        billNo = purchaseBill?.billNo || ''
      } else {
        const salesBill = await prisma.salesBill.findUnique({
          where: { id: payment.billId },
          select: { billNo: true }
        })
        billNo = salesBill?.billNo || ''
      }

      return {
        ...payment,
        billNo,
        partyName
      }
    }))

    return NextResponse.json(enhancedPayments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
