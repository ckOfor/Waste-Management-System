;; Waste Management System Smart Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Data Variables
(define-data-var last-bin-id uint u0)
(define-data-var last-product-id uint u0)

;; Maps
(define-map balances principal uint)
(define-map smart-bins
  uint
  { waste-type: (string-ascii 20), amount: uint, accuracy: uint }
)
(define-map products
  uint
  { name: (string-ascii 64), price: uint, seller: principal, material: (string-ascii 32) }
)

;; Public Functions

;; Register a new smart bin
(define-public (register-smart-bin (waste-type (string-ascii 20)))
  (let
    (
      (bin-id (+ (var-get last-bin-id) u1))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set smart-bins bin-id { waste-type: waste-type, amount: u0, accuracy: u100 })
    (var-set last-bin-id bin-id)
    (ok bin-id)
  )
)

;; Update smart bin data
(define-public (update-smart-bin (bin-id uint) (amount uint) (accuracy uint))
  (let
    (
      (bin (unwrap! (map-get? smart-bins bin-id) err-not-found))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (map-set smart-bins bin-id (merge bin { amount: amount, accuracy: accuracy })))
  )
)

;; Reward user for recycling
(define-public (reward-recycler (recycler principal) (amount uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (map-set balances recycler (+ (default-to u0 (map-get? balances recycler)) amount)))
  )
)

;; List a new upcycled product
(define-public (list-product (name (string-ascii 64)) (price uint) (material (string-ascii 32)))
  (let
    (
      (product-id (+ (var-get last-product-id) u1))
    )
    (map-set products product-id { name: name, price: price, seller: tx-sender, material: material })
    (var-set last-product-id product-id)
    (ok product-id)
  )
)

;; Buy a product
(define-public (buy-product (product-id uint))
  (let
    (
      (product (unwrap! (map-get? products product-id) err-not-found))
      (buyer-balance (default-to u0 (map-get? balances tx-sender)))
    )
    (asserts! (>= buyer-balance (get price product)) err-unauthorized)
    (try! (transfer (get price product) tx-sender (get seller product)))
    (ok true)
  )
)

;; Read-only functions

;; Get balance of an account
(define-read-only (get-balance (account principal))
  (default-to u0 (map-get? balances account))
)

;; Get smart bin details
(define-read-only (get-smart-bin (bin-id uint))
  (map-get? smart-bins bin-id)
)

;; Get product details
(define-read-only (get-product (product-id uint))
  (map-get? products product-id)
)

;; Private functions

;; Transfer tokens between accounts
(define-private (transfer (amount uint) (sender principal) (recipient principal))
  (let
    (
      (sender-balance (default-to u0 (map-get? balances sender)))
      (recipient-balance (default-to u0 (map-get? balances recipient)))
    )
    (asserts! (>= sender-balance amount) err-unauthorized)
    (map-set balances sender (- sender-balance amount))
    (map-set balances recipient (+ recipient-balance amount))
    (ok true)
  )
)

