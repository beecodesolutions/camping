import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { paymentInputSchema } from '@camping/contracts'
import type {
  CampingProfile,
  PaymentInput,
  StayQuote,
  ExtraTemplate,
  SessionUser,
  Stay,
} from '@camping/contracts'
import { formatMoney } from './services/money'
import {
  useAddExtraMutation,
  useAddPaymentMutation,
  useCampingQuery,
  useCloseStayMutation,
  useCreateExtraTemplateMutation,
  useExtraTemplatesQuery,
  useDeleteExtraMutation,
  useLogoutMutation,
  useQuoteMutation,
  useStayQuery,
  useStaysQuery,
  useUpdateExtraMutation,
  useUpdateExtraTemplateMutation,
  useUpdateRatesMutation,
} from './services/api'
import CheckInDialog from './CheckInDialog'
import { todayInTimezone } from './checkIn/schema'
import HomeHeader from './HomeHeader'
import StayList, { type StayAction, type StaySelection } from './StayList'
import OccupancyCard from './OccupancyCard'
import OccupancyChart from './OccupancyChart'
import WorkspaceNavigation, {
  type WorkspaceSection,
} from './WorkspaceNavigation'
import PendingBalanceCard from './PendingBalanceCard'
import { useTimeOfDay } from './app/timeOfDay'

type WorkspaceProps = { user: SessionUser; themeControl: ReactNode }
const pageSize = 8
const formGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
  gap: 2,
  alignItems: 'start',
  '& > .MuiTextField-root': { width: '100%', minWidth: 0 },
}

function countPeople(stay: Stay) {
  return stay.adults + stay.children + stay.infants
}
function ageLabel(range: { min: number; max: number | null }) {
  return range.max === null ? `${range.min}+` : `${range.min}–${range.max}`
}
function errorStatus(error: unknown) {
  return typeof error === 'object' && error !== null && 'status' in error
    ? String(error.status)
    : ''
}

export default function CampingWorkspace({
  user,
  themeControl,
}: WorkspaceProps) {
  const { t } = useTranslation()
  const { greeting } = useTimeOfDay()
  const [section, setSection] = useState<WorkspaceSection>('home')
  const [stayStatus, setStayStatus] = useState<'active' | 'closed'>('active')
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState<StaySelection | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const camping = useCampingQuery()
  const stays = useStaysQuery(
    section === 'home'
      ? { status: 'active', page: 1, pageSize: 10 }
      : { status: stayStatus, page, pageSize },
    { skip: section === 'settings' },
  )
  const [logout, logoutState] = useLogoutMutation()
  const profile = camping.data

  if (camping.isError && errorStatus(camping.error) === '401') return null
  if (camping.isError)
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, pt: 8 }}>
        <Alert
          severity="error"
          action={
            <Button onClick={() => void camping.refetch()}>
              {t('common.retry')}
            </Button>
          }
        >
          {t('home.loadError')}
        </Alert>
      </Box>
    )

  return (
    <>
      {checkInOpen && profile && (
        <CheckInDialog
          ageRanges={profile.ageRanges}
          timezone={profile.timezone}
          onClose={() => setCheckInOpen(false)}
          onSuccess={(name) => {
            setCheckInOpen(false)
            setRegisteredName(name)
          }}
        />
      )}
      <WorkspaceNavigation
        section={section}
        onNavigate={setSection}
        onCheckIn={() => setCheckInOpen(true)}
        checkInDisabled={!profile}
        userName={user.name}
        onLogout={() => void logout()}
        logoutPending={logoutState.isLoading}
        themeControl={themeControl}
      />
      <Box
        component="main"
        sx={{ maxWidth: 980, mx: 'auto', px: { xs: 2, sm: 3 }, pb: 5 }}
      >
        {logoutState.isError && (
          <Alert severity="error">{t('auth.logoutError')}</Alert>
        )}
        {registeredName && (
          <Alert severity="success" onClose={() => setRegisteredName(null)}>
            {t('checkIn.success', { name: registeredName })}
          </Alert>
        )}
        {profile && (
          <HomeHeader
            name={profile.name}
            greeting={t(greeting)}
            userName={user.name}
            showCheckIn={false}
          />
        )}
        {section === 'home' &&
          (profile ? (
            <>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <OccupancyCard
                    activeGroups={profile.activeGroups}
                    activePeople={profile.activePeople}
                    activeVehicles={profile.activeVehicles}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <PendingBalanceCard
                    pendingAmountMinor={profile.pendingAmountMinor}
                    currency={profile.currency}
                  />
                </Box>
              </Stack>
              <Paper
                component="section"
                aria-labelledby="active-stays-title"
                variant="outlined"
                sx={{ mt: 2, p: 2, borderRadius: 2 }}
              >
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Typography
                    id="active-stays-title"
                    component="h2"
                    variant="subtitle1"
                    sx={{ fontWeight: 700 }}
                  >
                    {t('home.activeStays')}
                  </Typography>
                  <Button
                    onClick={() => {
                      setStayStatus('active')
                      setPage(1)
                      setSection('stays')
                    }}
                    sx={{ flexShrink: 0 }}
                  >
                    {t('home.allStays')}
                  </Button>
                </Stack>
                {stays.isFetching && (
                  <Typography color="text.secondary">
                    {t('common.loading')}
                  </Typography>
                )}
                {stays.isError && (
                  <Alert
                    severity="error"
                    action={
                      <Button onClick={() => void stays.refetch()}>
                        {t('common.retry')}
                      </Button>
                    }
                  >
                    {t('home.loadError')}
                  </Alert>
                )}
                {stays.currentData && (
                  <StayList
                    items={stays.currentData.items}
                    timezone={profile.timezone}
                    onSelect={setSelection}
                  />
                )}
              </Paper>
            </>
          ) : (
            <LoadingPanel />
          ))}
        {section === 'settings' ? (
          profile ? (
            <SettingsPanel profile={profile} />
          ) : (
            <LoadingPanel />
          )
        ) : section === 'stays' ? (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <OccupancyChart />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>
                {t('navigation.stays')}
              </Typography>
            </Stack>
            <Tabs
              value={stayStatus}
              onChange={(_, value: 'active' | 'closed') => {
                setStayStatus(value)
                setPage(1)
              }}
              aria-label={t('navigation.stayViews')}
            >
              <Tab value="active" label={t('home.activeStays')} />
              <Tab value="closed" label={t('home.closedStays')} />
            </Tabs>
            {stays.isFetching && (
              <Typography color="text.secondary">
                {t('home.loading')}
              </Typography>
            )}
            {stays.isError && (
              <Alert severity="error">
                {t('home.loadError')}{' '}
                <Button onClick={() => void stays.refetch()}>
                  {t('common.retry')}
                </Button>
              </Alert>
            )}
            {stays.currentData && profile && (
              <StayList
                items={stays.currentData.items}
                timezone={profile.timezone}
                onSelect={setSelection}
              />
            )}
            {stays.currentData && (
              <Pagination
                page={stays.currentData.page}
                pageSize={stays.currentData.pageSize}
                total={stays.currentData.total}
                onPage={setPage}
              />
            )}
          </Stack>
        ) : null}
      </Box>
      {selection && profile && (
        <StayDetail
          id={selection.id}
          action={selection.action}
          timezone={profile.timezone}
          onClose={() => setSelection(null)}
        />
      )}
    </>
  )
}

function LoadingPanel() {
  return (
    <Box sx={{ py: 5 }}>
      <Typography color="text.secondary">Cargando…</Typography>
    </Box>
  )
}

function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const { t } = useTranslation()
  const max = Math.max(1, Math.ceil(total / pageSize))
  if (max <= 1) return null
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'center', alignItems: 'center' }}
    >
      <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('common.previous')}
      </Button>
      <Typography variant="body2">
        {page} / {max}
      </Typography>
      <Button disabled={page >= max} onClick={() => onPage(page + 1)}>
        {t('common.next')}
      </Button>
    </Stack>
  )
}

function StayDetail({
  id,
  action,
  timezone,
  onClose,
}: {
  id: string
  action: StayAction
  timezone: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const stayQuery = useStayQuery(id)
  const templates = useExtraTemplatesQuery()
  const [addExtra, addState] = useAddExtraMutation()
  const [updateExtra] = useUpdateExtraMutation()
  const [deleteExtra] = useDeleteExtraMutation()
  const [quote, quoteState] = useQuoteMutation()
  const [closeStay, closeState] = useCloseStayMutation()
  const [addPayment, paymentState] = useAddPaymentMutation()
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [description, setDescription] = useState('')
  const [unitPriceMinor, setUnitPriceMinor] = useState(0)
  const [departureDate, setDepartureDate] = useState(
    action === 'close' ? todayInTimezone(timezone) : '',
  )
  const [preview, setPreview] = useState<StayQuote | null>(null)
  const [paymentAmountMinor, setPaymentAmountMinor] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentInput['method']>('cash')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const stay = stayQuery.data
  const editable = !!stay && !stay.closure
  const minDeparture = stay?.arrivalDate ?? ''
  const effectivePaymentAmount =
    paymentAmountMinor === '' && stay?.closure && stay.account.balanceMinor > 0
      ? stay.account.balanceMinor
      : paymentAmountMinor
  const submitExtra = async () => {
    if (!stay) return
    setError('')
    try {
      const input = selectedTemplate
        ? { templateId: selectedTemplate, quantity }
        : {
            category,
            description: description.trim(),
            unitPriceMinor,
            quantity,
          }
      await addExtra({ id: stay.id, input }).unwrap()
      setPreview(null)
      setDescription('')
      setCategory('')
      setUnitPriceMinor(0)
      setSelectedTemplate('')
      if (action === 'extras') onClose()
    } catch {
      setError(t('stay.extraError'))
    }
  }
  const paymentInput = (): PaymentInput | undefined => {
    if (
      !stay ||
      typeof effectivePaymentAmount !== 'number' ||
      !Number.isSafeInteger(effectivePaymentAmount) ||
      effectivePaymentAmount < 1
    )
      return undefined
    const paidOn = paymentDate || todayInTimezone(timezone)
    if (paidOn > todayInTimezone(timezone)) return undefined
    const result = paymentInputSchema.safeParse({
      amountMinor: effectivePaymentAmount,
      method: paymentMethod,
      paidOn,
      note: paymentNote.trim(),
      idempotencyKey: paymentKey,
    })
    return result.success ? result.data : undefined
  }
  const requestQuote = async () => {
    if (!stay || !departureDate) return
    setError('')
    try {
      const result = await quote({ id: stay.id, departureDate }).unwrap()
      setPreview(result)
      setPaymentAmountMinor(
        result.account.balanceMinor > 0 ? result.account.balanceMinor : '',
      )
      setPaymentKey(crypto.randomUUID())
    } catch (e) {
      setPreview(null)
      setError(
        errorStatus(e) === '409'
          ? t('stay.versionConflict')
          : t('stay.quoteError'),
      )
    }
  }
  const submitPayment = async () => {
    if (!stay) return
    const input = paymentInput()
    if (!input) {
      setError(t('stay.paymentValidation'))
      return
    }
    if (
      stay.closure &&
      stay.account.balanceMinor > 0 &&
      input.amountMinor > stay.account.balanceMinor
    ) {
      setError(t('stay.paymentTooLarge'))
      return
    }
    setError('')
    try {
      const updated = await addPayment({ id: stay.id, input }).unwrap()
      setPaymentAmountMinor(
        updated.account.balanceMinor > 0 ? updated.account.balanceMinor : '',
      )
      setPaymentKey(crypto.randomUUID())
      setPreview(null)
      if (action === 'payment') onClose()
    } catch (e) {
      setError(
        errorStatus(e) === '409'
          ? t('stay.versionConflict')
          : t('stay.paymentError'),
      )
    }
  }
  const confirmClose = async () => {
    if (!stay || !preview) return
    const balance = preview.account.balanceMinor
    const payment = balance > 0 ? paymentInput() : undefined
    if (balance < 0) {
      setError(t('stay.closeCredit'))
      return
    }
    if (balance > 0) {
      if (!payment) {
        setError(t('stay.paymentValidation'))
        return
      }
      if (payment.amountMinor !== balance) {
        setError(t('stay.closeBalanceRequired'))
        return
      }
    }
    setError('')
    try {
      await closeStay({
        id: stay.id,
        departureDate: preview.departureDate,
        version: preview.version,
        ...(payment && balance > 0 ? { payment } : {}),
      }).unwrap()
      onClose()
    } catch (e) {
      setError(
        errorStatus(e) === '409'
          ? t('stay.versionConflict')
          : t('stay.closeError'),
      )
      setPreview(null)
    }
  }
  const handleUpdateExtra = async (arg: UpdateExtraArg) => {
    try {
      await updateExtra(arg).unwrap()
      setPreview(null)
    } catch {
      setError(t('stay.extraError'))
    }
  }
  const handleDeleteExtra = async (arg: DeleteExtraArg) => {
    try {
      await deleteExtra(arg).unwrap()
      setPreview(null)
    } catch {
      setError(t('stay.extraError'))
    }
  }
  const closePanel =
    stay && editable ? (
      <Stack spacing={2}>
        <Divider />
        <Typography variant="h6">{t('stay.closeTitle')}</Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: 'stretch' }}
        >
          <TextField
            type="date"
            label={t('stay.departureDate')}
            value={departureDate}
            onChange={(e) => {
              setDepartureDate(e.target.value)
              setPreview(null)
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: minDeparture,
                max: todayInTimezone(timezone),
              },
            }}
          />
          <Button
            variant="outlined"
            onClick={() => void requestQuote()}
            disabled={!departureDate || quoteState.isLoading}
          >
            {t('stay.previewTotal')}
          </Button>
        </Stack>
        {preview && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={0.5}>
              <Info label={t('stay.nights')} value={String(preview.nights)} />
              <Info
                label={t('stay.accommodation')}
                value={formatMoney(
                  preview.accommodationMinor,
                  stay.currency,
                  i18n.language,
                )}
              />
              <Info
                label={t('stay.extrasTotal')}
                value={formatMoney(
                  preview.extrasMinor,
                  stay.currency,
                  i18n.language,
                )}
              />
              <Typography variant="h6">
                {t('stay.total')}:{' '}
                {formatMoney(preview.totalMinor, stay.currency, i18n.language)}
              </Typography>
              {preview.account.balanceMinor > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('stay.closePaymentHelp', {
                    amount: formatMoney(
                      preview.account.balanceMinor,
                      stay.currency,
                      i18n.language,
                    ),
                  })}
                </Typography>
              )}
              {preview.account.balanceMinor < 0 && (
                <Typography variant="body2" color="error">
                  {t('stay.closeCredit')}
                </Typography>
              )}
              <Button
                variant="contained"
                onClick={() => void confirmClose()}
                disabled={
                  closeState.isLoading ||
                  preview.account.balanceMinor < 0 ||
                  (preview.account.balanceMinor > 0 &&
                    (typeof effectivePaymentAmount !== 'number' ||
                      effectivePaymentAmount !== preview.account.balanceMinor))
                }
              >
                {preview.account.balanceMinor > 0
                  ? t('stay.confirmPaymentClose')
                  : t('stay.confirmClose')}
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    ) : null
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            m: { xs: 1, sm: 4 },
            width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
          },
        },
      }}
    >
      <DialogTitle sx={{ overflowWrap: 'anywhere' }}>
        {action === 'payment'
          ? `${t('stay.recordPayment')} · `
          : action === 'extras'
            ? `${t('stay.addExtraAction')} · `
            : action === 'close'
              ? `${t('stay.closeTitle')} · `
              : ''}
        {stay?.responsibleName ?? t('home.loading')}
      </DialogTitle>
      <DialogContent dividers>
        {stayQuery.isError && (
          <Alert severity="error">{t('stay.loadError')}</Alert>
        )}
        {stay && (
          <Stack spacing={2}>
            {action === 'close' && closePanel}
            {action === 'detail' && (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Info
                    label={t('checkIn.arrivalDate')}
                    value={formatDate(stay.arrivalDate, i18n.language)}
                  />
                  <Info
                    label={t('checkIn.estimatedDeparture')}
                    value={
                      stay.estimatedDeparture
                        ? formatDate(stay.estimatedDeparture, i18n.language)
                        : t('stay.unscheduled')
                    }
                  />
                  <Info
                    label={t('stay.people')}
                    value={String(countPeople(stay))}
                  />
                </Stack>
                {stay.closure && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6">
                      {t('stay.closedSummary')}
                    </Typography>
                    <Box sx={{ ...formGridSx, mt: 1 }}>
                      <Info
                        label={t('stay.departureDate')}
                        value={formatDate(
                          stay.closure.departureDate,
                          i18n.language,
                        )}
                      />
                      <Info
                        label={t('stay.nights')}
                        value={String(stay.closure.nights)}
                      />
                      <Info
                        label={t('stay.accommodation')}
                        value={formatMoney(
                          stay.closure.accommodationMinor,
                          stay.currency,
                          i18n.language,
                        )}
                      />
                      <Info
                        label={t('stay.extrasTotal')}
                        value={formatMoney(
                          stay.closure.extrasMinor,
                          stay.currency,
                          i18n.language,
                        )}
                      />
                      <Info
                        label={t('stay.total')}
                        value={formatMoney(
                          stay.closure.totalMinor,
                          stay.currency,
                          i18n.language,
                        )}
                      />
                      <Info
                        label={t('stay.closedAt')}
                        value={formatDate(
                          stay.closure.closedAt.slice(0, 10),
                          i18n.language,
                        )}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {t('stay.totalCalculated')}
                    </Typography>
                  </Paper>
                )}
              </>
            )}
            {action !== 'extras' && (
              <>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6">{t('stay.account')}</Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ mt: 1 }}
                  >
                    <Info
                      label={t('stay.total')}
                      value={formatMoney(
                        stay.account.totalMinor,
                        stay.currency,
                        i18n.language,
                      )}
                    />
                    <Info
                      label={t('stay.paid')}
                      value={formatMoney(
                        stay.account.paidMinor,
                        stay.currency,
                        i18n.language,
                      )}
                    />
                    <Info
                      label={
                        stay.account.balanceMinor < 0
                          ? t('stay.credit')
                          : t('stay.remaining')
                      }
                      value={formatMoney(
                        Math.abs(stay.account.balanceMinor),
                        stay.currency,
                        i18n.language,
                      )}
                    />
                    <Info
                      label={t('stay.asOfDate')}
                      value={formatDate(stay.account.asOfDate, i18n.language)}
                    />
                  </Stack>
                  {stay.account.balanceMinor < 0 && (
                    <Typography color="info.main" sx={{ mt: 1 }}>
                      {t('stay.creditHelp')}
                    </Typography>
                  )}
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6">{t('stay.payments')}</Typography>
                  {action === 'detail' &&
                    (stay.payments.length === 0 ? (
                      <Typography color="text.secondary">
                        {t('stay.noPayments')}
                      </Typography>
                    ) : (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {stay.payments.map((payment) => (
                          <Stack
                            key={payment.id}
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{ justifyContent: 'space-between' }}
                          >
                            <Typography>
                              {formatDate(payment.paidOn, i18n.language)} ·{' '}
                              {t(`stay.paymentMethods.${payment.method}`)}
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                              {formatMoney(
                                payment.amountMinor,
                                stay.currency,
                                i18n.language,
                              )}
                            </Typography>
                            {payment.note && (
                              <Typography color="text.secondary">
                                {payment.note}
                              </Typography>
                            )}
                          </Stack>
                        ))}
                      </Stack>
                    ))}
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    <Box sx={formGridSx}>
                      <TextField
                        type="number"
                        label={t('stay.paymentAmount')}
                        value={effectivePaymentAmount}
                        onChange={(e) => {
                          setPaymentAmountMinor(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                          setPaymentKey(crypto.randomUUID())
                        }}
                        disabled={
                          paymentAmountMinor === '' &&
                          stay.closure !== null &&
                          stay.account.balanceMinor <= 0
                        }
                        slotProps={{
                          htmlInput: {
                            min: 1,
                            max:
                              stay.closure && stay.account.balanceMinor > 0
                                ? stay.account.balanceMinor
                                : undefined,
                          },
                        }}
                      />
                      <TextField
                        select
                        label={t('stay.paymentMethod')}
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(
                            e.target.value as PaymentInput['method'],
                          )
                          setPaymentKey(crypto.randomUUID())
                        }}
                        disabled={
                          stay.closure !== null &&
                          stay.account.balanceMinor <= 0
                        }
                      >
                        <MenuItem value="cash">
                          {t('stay.paymentMethods.cash')}
                        </MenuItem>
                        <MenuItem value="transfer">
                          {t('stay.paymentMethods.transfer')}
                        </MenuItem>
                        <MenuItem value="card">
                          {t('stay.paymentMethods.card')}
                        </MenuItem>
                      </TextField>
                      <TextField
                        type="date"
                        label={t('stay.paymentDate')}
                        value={paymentDate || todayInTimezone(timezone)}
                        onChange={(e) => {
                          setPaymentDate(e.target.value)
                          setPaymentKey(crypto.randomUUID())
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: { max: todayInTimezone(timezone) },
                        }}
                        disabled={
                          stay.closure !== null &&
                          stay.account.balanceMinor <= 0
                        }
                      />
                    </Box>
                    <TextField
                      label={t('stay.paymentNote')}
                      value={paymentNote}
                      onChange={(e) => {
                        setPaymentNote(e.target.value)
                        setPaymentKey(crypto.randomUUID())
                      }}
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                      disabled={
                        stay.closure !== null && stay.account.balanceMinor <= 0
                      }
                    />
                    <Button
                      variant="outlined"
                      onClick={() => void submitPayment()}
                      disabled={
                        paymentState.isLoading ||
                        typeof effectivePaymentAmount !== 'number' ||
                        !Number.isSafeInteger(effectivePaymentAmount) ||
                        effectivePaymentAmount < 1 ||
                        (stay.closure !== null &&
                          stay.account.balanceMinor <= 0) ||
                        (stay.closure !== null &&
                          stay.account.balanceMinor > 0 &&
                          effectivePaymentAmount > stay.account.balanceMinor)
                      }
                    >
                      {t('stay.recordPayment')}
                    </Button>
                  </Stack>
                </Paper>
              </>
            )}
            {(action === 'detail' || action === 'extras') && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {stay.location || t('stay.noLocation')} ·{' '}
                  {stay.hasVehicle
                    ? `${t('checkIn.vehicleSection')}: ${stay.vehicleDescription || t('stay.vehicleYes')}`
                    : t('checkIn.withoutVehicle')}
                </Typography>
                <Divider />
                <Typography variant="h6">{t('stay.extras')}</Typography>
                {stay.extras.length === 0 && (
                  <Typography color="text.secondary">
                    {t('stay.noExtras')}
                  </Typography>
                )}
                {stay.extras.map((extra) => (
                  <ExtraRow
                    key={extra.id}
                    stay={stay}
                    extra={extra}
                    editable={editable}
                    onUpdate={handleUpdateExtra}
                    onDelete={handleDeleteExtra}
                  />
                ))}
                {editable && (
                  <Box sx={formGridSx}>
                    <TextField
                      select
                      label={t('stay.template')}
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      <MenuItem value="">{t('stay.freeExtra')}</MenuItem>
                      {(templates.data ?? [])
                        .filter((template) => template.enabled)
                        .map((template) => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.description} ·{' '}
                            {formatMoney(
                              template.unitPriceMinor,
                              stay.currency,
                              i18n.language,
                            )}
                          </MenuItem>
                        ))}
                    </TextField>
                    {!selectedTemplate && (
                      <>
                        <TextField
                          label={t('stay.category')}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        />
                        <TextField
                          label={t('stay.description')}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                        <TextField
                          type="number"
                          label={t('stay.unitPrice')}
                          value={unitPriceMinor}
                          onChange={(e) =>
                            setUnitPriceMinor(Number(e.target.value))
                          }
                        />
                      </>
                    )}
                    <TextField
                      type="number"
                      label={t('stay.quantity')}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value)))
                      }
                    />
                    <Button
                      variant="outlined"
                      onClick={() => void submitExtra()}
                      disabled={addState.isLoading}
                    >
                      {t('stay.addExtra')}
                    </Button>
                  </Box>
                )}
              </>
            )}
            {action === 'detail' && closePanel}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

type UpdateExtraArg = {
  stayId: string
  extraId: string
  input: {
    category?: string
    description: string
    unitPriceMinor: number
    quantity: number
  }
}
type DeleteExtraArg = { stayId: string; extraId: string }
type UpdateExtra = (arg: UpdateExtraArg) => Promise<unknown>
type DeleteExtra = (arg: DeleteExtraArg) => Promise<unknown>

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>
  )
}
function ExtraRow({
  stay,
  extra,
  editable,
  onUpdate,
  onDelete,
}: {
  stay: Stay
  extra: Stay['extras'][number]
  editable: boolean
  onUpdate: UpdateExtra
  onDelete: DeleteExtra
}) {
  const { t, i18n } = useTranslation()
  const [quantity, setQuantity] = useState(extra.quantity)
  const [price, setPrice] = useState(extra.unitPriceMinor)
  const [description, setDescription] = useState(extra.description)
  const [category, setCategory] = useState(extra.category ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const save = async () => {
    setSaving(true)
    setError(false)
    try {
      await onUpdate({
        stayId: stay.id,
        extraId: extra.id,
        input: { category, description, unitPriceMinor: price, quantity },
      })
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }
  const remove = async () => {
    setSaving(true)
    setError(false)
    try {
      await onDelete({ stayId: stay.id, extraId: extra.id })
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Box sx={formGridSx}>
      <TextField
        size="small"
        label={t('stay.category')}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        disabled={!editable || saving}
      />
      <TextField
        size="small"
        label={t('stay.description')}
        value={description}
        disabled={!editable || saving}
        onChange={(e) => setDescription(e.target.value)}
      />
      <TextField
        size="small"
        type="number"
        label={t('stay.unitPrice')}
        value={price}
        disabled={!editable || saving}
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <TextField
        size="small"
        type="number"
        label={t('stay.quantity')}
        value={quantity}
        disabled={!editable || saving}
        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
      />
      <Stack
        direction="row"
        useFlexGap
        sx={{
          gridColumn: '1 / -1',
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ mr: 'auto', overflowWrap: 'anywhere' }}>
          {formatMoney(price * quantity, stay.currency, i18n.language)}
        </Typography>
        {error && <Typography color="error">{t('stay.extraError')}</Typography>}
        {editable && (
          <>
            <Button size="small" onClick={() => void save()} disabled={saving}>
              {t('common.save')}
            </Button>
            <IconButton
              aria-label={t('common.delete')}
              onClick={() => void remove()}
              disabled={saving}
            >
              ×
            </IconButton>
          </>
        )}
      </Stack>
    </Box>
  )
}

function SettingsPanel({ profile }: { profile: CampingProfile }) {
  const { t } = useTranslation()
  const templates = useExtraTemplatesQuery()
  const [create, createState] = useCreateExtraTemplateMutation()
  const [update] = useUpdateExtraTemplateMutation()
  const [updateRates, ratesState] = useUpdateRatesMutation()
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [unitPriceMinor, setUnitPriceMinor] = useState(0)
  const [rates, setRates] = useState(profile.rates)
  const [error, setError] = useState('')
  const saveTemplate = async () => {
    if (!description.trim()) return
    try {
      await create({
        category,
        description: description.trim(),
        unitPriceMinor,
      }).unwrap()
      setDescription('')
      setCategory('')
      setUnitPriceMinor(0)
    } catch {
      setError(t('settings.saveError'))
    }
  }
  const saveRates = async () => {
    try {
      await updateRates(rates).unwrap()
    } catch {
      setError(t('settings.saveError'))
    }
  }
  return (
    <Stack spacing={3} sx={{ mt: 3 }}>
      <Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>
        {t('settings.title')}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">{t('settings.rates')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('settings.ratesHelp')}
        </Typography>
        <Box sx={formGridSx}>
          {(['adults', 'children', 'infants'] as const).map((category) => (
            <TextField
              key={category}
              type="number"
              label={`${t(`checkIn.${category}`)} (${ageLabel(profile.ageRanges[category])})`}
              value={rates[category]}
              onChange={(e) =>
                setRates({
                  ...rates,
                  [category]: Math.max(0, Number(e.target.value)),
                })
              }
            />
          ))}
          <Button
            variant="contained"
            onClick={() => void saveRates()}
            disabled={ratesState.isLoading}
          >
            {t('common.save')}
          </Button>
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">{t('settings.templates')}</Typography>
        <Stack spacing={3} divider={<Divider />} sx={{ mt: 2 }}>
          {templates.isError && (
            <Alert severity="error">{t('settings.loadError')}</Alert>
          )}
          {(templates.data ?? []).map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              currency={profile.currency}
              onSave={update}
            />
          ))}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={formGridSx}>
          <TextField
            label={t('stay.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <TextField
            label={t('stay.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            type="number"
            label={t('stay.unitPrice')}
            value={unitPriceMinor}
            onChange={(e) => setUnitPriceMinor(Number(e.target.value))}
          />
          <Button
            variant="outlined"
            onClick={() => void saveTemplate()}
            disabled={createState.isLoading}
          >
            {t('settings.createTemplate')}
          </Button>
        </Box>
      </Paper>
    </Stack>
  )
}
function TemplateRow({
  template,
  currency,
  onSave,
}: {
  template: ExtraTemplate
  currency: string
  onSave: ReturnType<typeof useUpdateExtraTemplateMutation>[0]
}) {
  const { t, i18n } = useTranslation()
  const [description, setDescription] = useState(template.description)
  const [category, setCategory] = useState(template.category ?? '')
  const [price, setPrice] = useState(template.unitPriceMinor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const save = async (patch: {
    category?: string
    description?: string
    unitPriceMinor?: number
    enabled?: boolean
  }) => {
    setSaving(true)
    setError(false)
    try {
      await onSave({ id: template.id, patch }).unwrap()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Box sx={formGridSx}>
      <TextField
        size="small"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        label={t('stay.category')}
        disabled={saving}
      />
      <TextField
        size="small"
        label={t('stay.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={saving}
      />
      <TextField
        size="small"
        type="number"
        label={t('stay.unitPrice')}
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        disabled={saving}
      />
      <Stack
        direction="row"
        useFlexGap
        sx={{
          gridColumn: '1 / -1',
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ mr: 'auto', overflowWrap: 'anywhere' }}>
          {formatMoney(price, currency, i18n.language)}
        </Typography>
        {error && (
          <Typography color="error">{t('settings.saveError')}</Typography>
        )}
        <Button
          size="small"
          onClick={() =>
            void save({ category, description, unitPriceMinor: price })
          }
          disabled={saving}
        >
          {t('common.save')}
        </Button>
        <Button
          size="small"
          onClick={() => void save({ enabled: !template.enabled })}
          disabled={saving}
        >
          {template.enabled ? t('settings.deactivate') : t('settings.activate')}
        </Button>
      </Stack>
    </Box>
  )
}
function formatDate(value: string, locale: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
