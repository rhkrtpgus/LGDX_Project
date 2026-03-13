package com.example.demo.domain;

public record UserAccount(
	int userId,
	String userName,
	Integer birthYear
) {
}
