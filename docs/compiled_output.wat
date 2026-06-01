(module
  (func $transition (param $x i32) (param $y i32) (result i32) (result i32)
    local.get $x
    local.get $y
    i32.add
    local.get $x
    local.get $y
    i32.sub
  )
  (export "transition" (func $transition))
)
