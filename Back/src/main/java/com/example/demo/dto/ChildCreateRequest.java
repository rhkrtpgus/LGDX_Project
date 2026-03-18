package com.example.demo.dto;

public record ChildCreateRequest(
	Integer familyId,
	String childName,
	Integer birthYear,
	Integer dailyLimitMinutes
) {
}
