package com.example.demo.dto;

public record ParentChildResponse(
	Integer childId,
	String childName,
	Integer birthYear,
	Integer todayWatchMinutes,
	boolean viewingAllowedNow,
	ChildWatchPolicyResponse watchPolicy
) {
}
