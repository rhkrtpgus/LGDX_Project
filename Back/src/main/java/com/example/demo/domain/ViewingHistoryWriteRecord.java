package com.example.demo.domain;

import java.time.LocalDateTime;

public class ViewingHistoryWriteRecord {

	private Integer viewingId;
	private Integer userId;
	private Integer childId;
	private String videoId;
	private LocalDateTime watchTime;
	private Integer watchDuration;

	public Integer getViewingId() {
		return viewingId;
	}

	public void setViewingId(Integer viewingId) {
		this.viewingId = viewingId;
	}

	public Integer getUserId() {
		return userId;
	}

	public void setUserId(Integer userId) {
		this.userId = userId;
	}

	public Integer getChildId() {
		return childId;
	}

	public void setChildId(Integer childId) {
		this.childId = childId;
	}

	public String getVideoId() {
		return videoId;
	}

	public void setVideoId(String videoId) {
		this.videoId = videoId;
	}

	public LocalDateTime getWatchTime() {
		return watchTime;
	}

	public void setWatchTime(LocalDateTime watchTime) {
		this.watchTime = watchTime;
	}

	public Integer getWatchDuration() {
		return watchDuration;
	}

	public void setWatchDuration(Integer watchDuration) {
		this.watchDuration = watchDuration;
	}
}
