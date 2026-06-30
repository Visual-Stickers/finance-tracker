// data.js - Master seed data
const MASTER_DATA = {
  loans: [{
    id: 'loan_hdfc_personal', name: 'HDFC Personal Loan', bank: 'HDFC Bank',
    principal: 1346516, netDisbursed: 1322130, outstanding: 1319259.06,
    emi: 25184, interestRate: 10.35, apr: 10.42,
    totalInterest: 462834, totalPayable: 1809350,
    tenure: 72, emisPaid: 2, emisRemaining: 70,
    startDate: '2026-05-01', endDate: '2032-04-01',
    emiStartDate: '2026-06-05', emiEndDate: '2032-06-04',
    repaymentMode: 'Auto Debit',
    processingFee: 7670, stampDuty: 200, insurance: 16516, bounceCharge: 450,
    paymentHistory: []
  }],
  creditCards: [],
  months: [
    { key:'2026-05', label:'May 2026', income:53680, expenses:{'HDFC Loan':21312,'Rent':12000,'Amma':4000,'Monthly seat':1800,'Miscellaneous':0}, balance:14568 },
    { key:'2026-06', label:'Jun 2026', income:71680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':1850,'Miscellaneous':0}, balance:28644 },
    { key:'2026-07', label:'Jul 2026', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':1900,'Miscellaneous':0}, balance:8594 },
    { key:'2026-08', label:'Aug 2026', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':1950,'Miscellaneous':0}, balance:8544 },
    { key:'2026-09', label:'Sep 2026', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2000,'Miscellaneous':0}, balance:8494 },
    { key:'2026-10', label:'Oct 2026', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2050,'Miscellaneous':0}, balance:8444 },
    { key:'2026-11', label:'Nov 2026', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2100,'Miscellaneous':0}, balance:10394 },
    { key:'2026-12', label:'Dec 2026', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2150,'Miscellaneous':0}, balance:10344 },
    { key:'2027-01', label:'Jan 2027', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2200,'Miscellaneous':0}, balance:10294 },
    { key:'2027-02', label:'Feb 2027', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2250,'Miscellaneous':0}, balance:10244 },
    { key:'2027-03', label:'Mar 2027', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2300,'Miscellaneous':0}, balance:10194 },
    { key:'2027-04', label:'Apr 2027', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2350,'Miscellaneous':0}, balance:10144 },
    { key:'2027-05', label:'May 2027', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2400,'Miscellaneous':0}, balance:8094 },
    { key:'2027-06', label:'Jun 2027', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2450,'Miscellaneous':0}, balance:8044 },
    { key:'2027-07', label:'Jul 2027', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':2500,'Miscellaneous':0}, balance:7994 },
    { key:'2027-08', label:'Aug 2027', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':0,'Miscellaneous':0}, balance:10494 },
    { key:'2027-09', label:'Sep 2027', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':0,'Miscellaneous':0}, balance:10494 },
    { key:'2027-10', label:'Oct 2027', income:51680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':0,'Miscellaneous':0}, balance:12494 },
    { key:'2027-11', label:'Nov 2027', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':0,'Miscellaneous':0}, balance:12494 },
    { key:'2027-12', label:'Dec 2027', income:53680, expenses:{'HDFC Loan':25186,'Rent':12000,'Amma':4000,'Monthly seat':0,'Miscellaneous':0}, balance:12494 },
  ]
};
