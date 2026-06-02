(module
  (memory (export "memory") 1)
  (global $pc (mut i32) (i32.const 2))
  (global $wat_len (mut i32) (i32.const 2))
  (global $a (mut i32) (i32.const 1))
  (global $b (mut i32) (i32.const 1))
  (global $c (mut i32) (i32.const 0))
  (func $transition (export "transition")
    global.get $pc
    i32.const 1
    i32.add
    global.set $pc
    global.get $wat_len
    i32.const 1
    i32.add
    global.set $wat_len
    i32.const 1024
    global.get $wat_len
    i32.const 4
    i32.mul
    i32.add
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.store
    global.get $a
    global.get $b
    i32.and
    global.get $c
    i32.xor
    global.set $c
  )
  (func $get_pc (export "get_pc") (result i32)
    global.get $pc
  )
  (func $get_wat_len (export "get_wat_len") (result i32)
    global.get $wat_len
  )
  (func $get_a (export "get_a") (result i32)
    global.get $a
  )
  (func $get_b (export "get_b") (result i32)
    global.get $b
  )
  (func $get_c (export "get_c") (result i32)
    global.get $c
  )
)
