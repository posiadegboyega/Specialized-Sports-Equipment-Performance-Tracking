;; Equipment Registration Contract
;; Records details of professional sports gear

(define-data-var last-equipment-id uint u0)

(define-map equipment-registry
  { equipment-id: uint }
  {
    name: (string-utf8 100),
    category: (string-utf8 50),
    manufacturer: (string-utf8 100),
    serial-number: (string-utf8 50),
    manufacture-date: uint,
    owner: principal,
    registered-at: uint
  }
)

(define-read-only (get-equipment (equipment-id uint))
  (map-get? equipment-registry { equipment-id: equipment-id })
)

(define-read-only (get-last-equipment-id)
  (var-get last-equipment-id)
)

(define-public (register-equipment
    (name (string-utf8 100))
    (category (string-utf8 50))
    (manufacturer (string-utf8 100))
    (serial-number (string-utf8 50))
    (manufacture-date uint))
  (let
    (
      (new-id (+ (var-get last-equipment-id) u1))
      (current-time (get-block-info? time (- block-height u1)))
    )
    (asserts! (is-some current-time) (err u1000))
    (var-set last-equipment-id new-id)
    (map-set equipment-registry
      { equipment-id: new-id }
      {
        name: name,
        category: category,
        manufacturer: manufacturer,
        serial-number: serial-number,
        manufacture-date: manufacture-date,
        owner: tx-sender,
        registered-at: (unwrap! current-time (err u1001))
      }
    )
    (ok new-id)
  )
)

(define-public (transfer-equipment (equipment-id uint) (new-owner principal))
  (let
    (
      (equipment (unwrap! (get-equipment equipment-id) (err u2000)))
    )
    (asserts! (is-eq tx-sender (get owner equipment)) (err u2001))
    (map-set equipment-registry
      { equipment-id: equipment-id }
      (merge equipment { owner: new-owner })
    )
    (ok true)
  )
)
