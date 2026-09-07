package com.example.backend1.realtime;

record RealtimeDomainEvent(String username, String destination, RealtimeEvent payload) {}
