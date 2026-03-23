package com.example.demo.repository;

import com.example.demo.domain.AlertLogRecord;
import com.example.demo.domain.ChildProfile;
import com.example.demo.domain.ChildYoutubeCategoryFilterRecord;
import com.example.demo.domain.ChildWatchPolicyRecord;
import com.example.demo.domain.ViewingHistoryWriteRecord;
import com.example.demo.dto.ParentAlertResponse;
import com.example.demo.dto.ParentViewingHistoryResponse;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ParentControlMapper {

	String findFamilyNameById(@Param("familyId") int familyId);

	ChildProfile findChildById(@Param("childId") int childId);

	List<ChildProfile> findChildrenByFamilyId(@Param("familyId") int familyId);

	Integer nextChildId();

	void insertChild(
		@Param("childId") int childId,
		@Param("familyId") int familyId,
		@Param("childName") String childName,
		@Param("birthYear") int birthYear
	);

	ChildWatchPolicyRecord findWatchPolicyByChildId(@Param("childId") int childId);

	void upsertWatchPolicy(ChildWatchPolicyRecord record);

	List<ChildYoutubeCategoryFilterRecord> findYoutubeCategoryFiltersByChildId(@Param("childId") int childId);

	void upsertYoutubeCategoryFilter(ChildYoutubeCategoryFilterRecord record);

	Integer sumTodayWatchMinutesByChildId(@Param("childId") int childId);

	int countTodayViewingsByFamilyId(@Param("familyId") int familyId);

	int countAlertsByFamilyId(@Param("familyId") int familyId);

	List<ParentViewingHistoryResponse> findViewingHistory(
		@Param("familyId") int familyId,
		@Param("childId") Integer childId,
		@Param("limit") int limit
	);

	List<ParentAlertResponse> findAlertsByFamilyId(
		@Param("familyId") int familyId,
		@Param("limit") int limit
	);

	Integer nextViewingId();

	void insertViewingHistory(ViewingHistoryWriteRecord record);

	Integer nextAlertId();

	void insertAlert(AlertLogRecord record);

	void deleteChild(@Param("childId") int childId);

	int countPolicies();

	int countHighRiskAlerts();
}
