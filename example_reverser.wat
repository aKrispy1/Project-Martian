(module
  (memory (export "memory") 1)
  (global $read_pc (mut i32) (i32.const -1))
  (global $write_pc (mut i32) (i32.const 7))
  (func $transition (export "transition")
    i32.const 32
    global.get $write_pc
    i32.const 4
    i32.mul
    i32.add
    i32.const 0
    global.get $read_pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 32
    global.get $write_pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    global.get $read_pc
    i32.const 0
    i32.ge_s
    select
    i32.store
    global.get $read_pc
    i32.const 1
    i32.sub
    global.get $read_pc
    global.get $read_pc
    i32.const 0
    i32.ge_s
    select
    global.set $read_pc
    global.get $write_pc
    i32.const 1
    i32.add
    global.get $write_pc
    global.get $read_pc
    i32.const 0
    i32.ge_s
    select
    global.set $write_pc
  )
  (func $get_read_pc (export "get_read_pc") (result i32)
    global.get $read_pc
  )
  (func $get_write_pc (export "get_write_pc") (result i32)
    global.get $write_pc
  )
)
