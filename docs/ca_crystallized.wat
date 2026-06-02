(module
  (global $c_0_0 (mut i32) (i32.const 1))
  (global $c_0_1 (mut i32) (i32.const 0))
  (global $c_0_2 (mut i32) (i32.const 1))
  (global $c_0_3 (mut i32) (i32.const 0))
  (global $c_1_0 (mut i32) (i32.const 0))
  (global $c_1_1 (mut i32) (i32.const 0))
  (global $c_1_2 (mut i32) (i32.const 1))
  (global $c_1_3 (mut i32) (i32.const 0))
  (global $c_2_0 (mut i32) (i32.const 1))
  (global $c_2_1 (mut i32) (i32.const 0))
  (global $c_2_2 (mut i32) (i32.const 1))
  (global $c_2_3 (mut i32) (i32.const 0))
  (global $c_3_0 (mut i32) (i32.const 1))
  (global $c_3_1 (mut i32) (i32.const 0))
  (global $c_3_2 (mut i32) (i32.const 0))
  (global $c_3_3 (mut i32) (i32.const 1))
  (func $transition (export "transition")
    i32.const 1
    global.get $c_0_3
    global.get $c_3_0
    i32.and
    i32.sub
    global.set $c_0_0
    i32.const 1
    global.get $c_0_0
    i32.sub
    global.set $c_0_1
    i32.const 1
    global.get $c_0_1
    i32.sub
    global.set $c_0_2
    i32.const 1
    global.get $c_0_2
    global.get $c_3_3
    i32.or
    i32.sub
    global.set $c_0_3
    i32.const 1
    global.get $c_1_3
    i32.sub
    global.set $c_1_0
    global.get $c_1_0
    global.get $c_0_1
    i32.or
    global.set $c_1_1
    global.get $c_1_1
    global.get $c_0_2
    i32.and
    global.set $c_1_2
    global.get $c_1_2
    global.get $c_0_3
    i32.or
    global.set $c_1_3
    i32.const 1
    global.get $c_2_3
    global.get $c_1_0
    i32.or
    i32.sub
    global.set $c_2_0
    global.get $c_2_0
    global.get $c_1_1
    i32.xor
    global.set $c_2_1
    i32.const 1
    global.get $c_2_1
    global.get $c_1_2
    i32.and
    i32.sub
    global.set $c_2_2
    global.get $c_2_2
    global.get $c_1_3
    i32.and
    global.set $c_2_3
    global.get $c_3_3
    global.get $c_2_0
    i32.xor
    global.set $c_3_0
    global.get $c_3_0
    global.get $c_2_1
    i32.and
    global.set $c_3_1
    global.get $c_3_1
    global.get $c_2_2
    i32.and
    global.set $c_3_2
    i32.const 1
    global.get $c_3_2
    global.get $c_2_3
    i32.or
    i32.sub
    global.set $c_3_3
  )
  (func $get_c_0_0 (export "get_c_0_0") (result i32)
    global.get $c_0_0
  )
  (func $get_c_0_1 (export "get_c_0_1") (result i32)
    global.get $c_0_1
  )
  (func $get_c_0_2 (export "get_c_0_2") (result i32)
    global.get $c_0_2
  )
  (func $get_c_0_3 (export "get_c_0_3") (result i32)
    global.get $c_0_3
  )
  (func $get_c_1_0 (export "get_c_1_0") (result i32)
    global.get $c_1_0
  )
  (func $get_c_1_1 (export "get_c_1_1") (result i32)
    global.get $c_1_1
  )
  (func $get_c_1_2 (export "get_c_1_2") (result i32)
    global.get $c_1_2
  )
  (func $get_c_1_3 (export "get_c_1_3") (result i32)
    global.get $c_1_3
  )
  (func $get_c_2_0 (export "get_c_2_0") (result i32)
    global.get $c_2_0
  )
  (func $get_c_2_1 (export "get_c_2_1") (result i32)
    global.get $c_2_1
  )
  (func $get_c_2_2 (export "get_c_2_2") (result i32)
    global.get $c_2_2
  )
  (func $get_c_2_3 (export "get_c_2_3") (result i32)
    global.get $c_2_3
  )
  (func $get_c_3_0 (export "get_c_3_0") (result i32)
    global.get $c_3_0
  )
  (func $get_c_3_1 (export "get_c_3_1") (result i32)
    global.get $c_3_1
  )
  (func $get_c_3_2 (export "get_c_3_2") (result i32)
    global.get $c_3_2
  )
  (func $get_c_3_3 (export "get_c_3_3") (result i32)
    global.get $c_3_3
  )
)
