# Flexible accommodation pricing and shared rooms

Accommodation types retain `baseNightlyPriceMinor` as their canonical base rate.
Their optional `pricing` configuration selects `per_unit`, `per_person`, or
`per_bed`, with category rates, category-specific included occupancy and additional
rates, pet price, weekday overrides and block discounts. A null configuration
inherits the existing unit base or camping person rates. Age ranges remain on the
camping profile; no thresholds are introduced by this feature.

Inventory is independent of the pricing basis. `individual` reserves one private
unit, `unlimited` preserves unquantified camping inventory, and `shared` reserves
beds within a real unit. Shared inventory requires `per_bed`; other modes accept
unit/person pricing. A reservation never spans multiple rooms.

## Pricing semantics

- Dates represent the property's local calendar, `[checkInDate, checkOutDate)`.
  UTC calendar arithmetic enumerates these date labels without converting them
  into server-local instants. Weekday keys use Sunday=0 through Saturday=6.
- The default price applies unless a weekday overrides a field. Category rate
  objects in an override replace the category rate object as a whole.
- Unit pricing includes configured counts of each category. Only the excess of
  that category incurs its additional rate. Person pricing uses actual counts;
  bed pricing uses the actual number of required beds.
- Infants consume no capacity or bed by default. The camping-level
  `infantsConsumeCapacity` setting changes both; free infant rates are a separate
  choice. Shared reservations require an adult. Pets never consume human places.
- All amounts are integer currency minor units. Percentage benefit `value` is
  integer **basis points** (2000 = 20%). The admin UI displays ordinary percent.
  Percentage discounts round half-up to a minor unit per block, then the total
  follows the existing property currency/whole-unit rounding policy.
- Blocks start at check-in and do not slide. `repeat=false` applies to the first
  completed block only; `repeat=true` applies to every completed block. Trailing
  nights remain at their ordinary rates. Free nights use the cheapest human
  nightly prices in their block.
- Each discount competes independently with every other discount and with no
  discount. The lowest total wins; ties retain configuration order. Fixed prices
  never increase the ordinary price and no benefit creates a negative subtotal.
- Discounts cover accommodation and human charges, excluding pets and extras.
  Monetary block values apply to the entire reservation for unit/person pricing,
  but to each bed for bed pricing. Free nights retain inventory occupancy.
- Backend snapshots freeze the complete resolved pricing configuration and
  infant occupancy policy. They expose nightly amounts, category charge subtotal,
  discount amount/rule index, pets, rounding and negotiated adjustments. Edits,
  check-in and linked-stay billing reuse the same engine and frozen rules.
- Legacy standalone walk-in stays retain their existing camping-rate calculation;
  the new accommodation rules apply through quoted reservations and linked stays.
  Walk-in pet counts are retained, without inventing an accommodation association.

## Search and capacity

`POST /api/reservations/search` accepts `pets` (omitted means zero) and
`includeInsufficientCapacity` (omitted means false), alongside the existing dates
and adult/child/infant counts.

Offers expose `capacityMatch`, `sparePlaces`, and, for shared rooms,
`availableBeds`/`requestedBeds`. Private insufficient offers are hidden unless the
filter is enabled or adults plus capacity-consuming infants fit and the excess
comes from children. Children-only overflow displays an advisory warning and
requires no extra acceptance. Other overflow requires `capacityOverrideReason`
on the quote/reservation. This never authorizes a shortage of beds.

Oversized offers stay visible and retain their price. Default ordering is exact
(or unlimited), oversized, insufficient; ascending total within each group, then
stable name/unit ordering. Shared offers are exact for the number of requested
beds and are never penalized for beds left unoccupied.

Search is read-only, does not hold inventory and does not expose selected bed
identities. Quotes and writes revalidate availability. Creation still requires
`acceptedTotalMinor` and an idempotency key; edits retain optimistic versions.

## Bed inventory and APIs

- Existing type/unit CRUD accepts shared inventory and pricing settings.
- `GET /api/accommodations/units/:id/beds` lists stable beds.
- `POST /api/accommodations/units/:id/beds` creates a bed with `name`, `position`,
  and `enabled`.
- `PATCH /api/accommodations/units/:id/beds/:bedId` updates those same fields.
  Beds are disabled rather than deleted; active allocations prevent disabling.
- `PATCH /api/camping/occupancy-settings` updates `infantsConsumeCapacity`.
- Existing reservation quote/create/update routes accept pets and capacity
  exception reasons. Reservation detail includes `allocatedBeds` IDs/names.
- `GET /api/availability` adds the shared branch with per-unit beds available
  throughout the stay and daily total/available/reserved/blocked bed counts.

Automatic allocation picks stable ordered beds available for the entire stay,
retaining existing assignments when possible. Room changes and date edits replace
allocations atomically. There are no automatic mid-stay bed changes. Whole-room
blocks cover all its beds. Cancel/no-show/checkout releases occupied nights while
retaining the reservation's historical assignments.

Every inventory mutation retains the tenant-row lock protocol. PostgreSQL also
uniquely constrains `(camping_id, bed_id, night)`, and composite foreign keys
prevent cross-tenant or cross-room allocation. The nightly occupancy constraint
protects even against writers outside the application locking protocol.

## Migration and verification

Migration `1760000007000-FlexiblePricingAndBeds` adds pricing, the infant policy,
pet counts, capacity exception reasons, bed inventory, assignments and nightly
occupancy. It extends existing snapshot checks to bed pricing, preserving old
rows and unrelated development data. Downgrade refuses to discard feature data.

Validation uses the separate `camping_test` PostgreSQL database. The shared-room
suite covers concurrent allocation, partial occupancy, multiple beds, adjacency,
room/type changes, cancellation, shared check-in, extras and checkout. Pure tests
cover all four block benefits, weekday changes, pet exclusion, rounding, overflow,
non-stacking and frozen snapshot recalculation. UI tests cover the selector,
capacity filter, warnings, bed counts and backend-provided price breakdown.

No production migration or deployment is performed by implementation tests.
The runtime role provisioning script includes the explicitly approved privileges
for the new tables and configuration columns. Restricted-role integration tests
cover configuration, allocation, edits and cancellation; beds cannot be deleted. Public bed selection, manual bed reassignment and
pet-admission onboarding remain outside this version.

For the Ekko priceboard configuration command, see [the operational guide](ekko-priceboard.md).
