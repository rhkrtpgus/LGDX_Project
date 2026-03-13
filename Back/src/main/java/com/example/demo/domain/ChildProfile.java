package com.example.demo.domain;

public record ChildProfile(
	int childId,
	int userId,
	String childName,
	Integer birthYear
) {
}
