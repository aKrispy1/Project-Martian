(module
  (global $a (mut i32) (i32.const 6))
  (global $b (mut i32) (i32.const 7))
  (global $op (mut i32) (i32.const 0))
  (global $res (mut i32) (i32.const 1))
  (func $transition (export "transition")
    global.get $a
    global.get $b
    i32.add
    global.get $a
    global.get $b
    i32.sub
    global.get $a
    global.get $b
    i32.xor
    global.get $res
    global.get $op
    i32.const 3
    i32.eq
    select
    global.get $op
    i32.const 2
    i32.eq
    select
    global.get $op
    i32.const 1
    i32.eq
    select
    global.set $res
    i32.const 0
    global.set $op
  )
  (func $get_a (export "get_a") (result i32)
    global.get $a
  )
  (func $get_b (export "get_b") (result i32)
    global.get $b
  )
  (func $get_op (export "get_op") (result i32)
    global.get $op
  )
  (func $get_res (export "get_res") (result i32)
    global.get $res
  )
)
