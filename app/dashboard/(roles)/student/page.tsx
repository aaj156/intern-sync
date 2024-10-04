'use client';

import AddInternshipCard from '@/app/dashboard/(roles)/student/AddInternshipCard';
import CompleteProfileCard from '@/app/dashboard/(roles)/student/CompleteProfileCard';
import MarkAttendanceCard from '@/app/dashboard/(roles)/student/MarkAttendanceCard';
import SubmitReportCard from '@/app/dashboard/(roles)/student/SubmitReportCard';
import UpcomingInternshipCard from '@/app/dashboard/(roles)/student/UpcomingInternshipCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CurrentAttendanceChart from '@/components/ui/CurrentAttendanceChart';
import { Loader } from '@/components/ui/Loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/context/UserContext';
import { convertUTCtoIST } from '@/lib/utils';
import {
  checkHolidayForStudent,
  getTotalPresentDays,
  getTotalWorkingDays,
} from '@/services/api';
import {
  useMarkCheckInAndModeAttendance,
  useMarkCheckOutAttendance,
} from '@/services/mutations/attendance';
import { useAddDailyReport } from '@/services/mutations/reports';
import {
  useDailyReport,
  useInternshipAttendance,
  useStudentInternships,
  useStudentProfile,
} from '@/services/queries';
import { useEffect, useMemo, useState } from 'react';

const StudentDashboardPage = () => {
  const { user } = useUser();
  const [totalWorkingDays, setTotalWorkingDays] = useState(0);
  const [totalPresentDays, setTotalPresentDays] = useState(0);
  const [isHoliday, setIsHoliday] = useState(false);

  const currentUTCDate = new Date().toISOString();
  const currentISTDate = useMemo(() => {
    return new Date(convertUTCtoIST(currentUTCDate));
  }, [currentUTCDate]);

  const { data: studentData } = useStudentProfile({
    userId: user?.user_metadata.uid,
  });

  const { data: studentInternships } = useStudentInternships({
    studentId: user?.user_metadata.uid,
  });

  const currentInternship = studentInternships?.find(
    (internship) =>
      new Date(internship.start_date) <= new Date() &&
      new Date(internship.end_date) >= new Date()
  );

  const { data: attendanceData, isLoading: isLoadingAttendance } =
    useInternshipAttendance({
      internshipId: currentInternship?.id,
      attendanceDate: new Date().toISOString().split('T')[0],
    });

  const { data: reportData, isLoading: isLoadingReport } = useDailyReport({
    attendanceId: attendanceData?.id,
    reportDate: new Date().toISOString().split('T')[0],
  });

  const { addDailyReport } = useAddDailyReport({
    attendanceId: attendanceData?.id || '',
    studentId: user?.user_metadata.uid || '',
    internshipId: currentInternship?.id || '',
  });

  const { markCheckInAndModeAttendance } = useMarkCheckInAndModeAttendance({
    attendanceId: attendanceData?.id || '',
    studentId: user?.user_metadata.uid || '',
    internshipId: currentInternship?.id || '',
    attendanceDate: new Date().toISOString().split('T')[0],
  });

  const { markCheckOutAttendance } = useMarkCheckOutAttendance({
    attendanceId: attendanceData?.id || '',
    studentId: user?.user_metadata.uid || '',
    internshipId: currentInternship?.id || '',
    attendanceDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (currentInternship && studentData) {
      const fetchAttendanceData = async () => {
        const internshipEndDate = new Date(currentInternship.end_date);

        const effectiveEndDate =
          currentISTDate < internshipEndDate
            ? currentISTDate
            : internshipEndDate;

        const workingDays = await getTotalWorkingDays(
          currentInternship.start_date,
          effectiveEndDate.toISOString().split('T')[0],
          currentInternship.region
        );
        const presentDays = await getTotalPresentDays(
          user?.user_metadata?.uid || '',
          currentInternship.id
        );

        setTotalWorkingDays(workingDays || 0);
        setTotalPresentDays(presentDays || 0);

        const isHoliday = await checkHolidayForStudent(
          user?.user_metadata?.uid || '',
          currentInternship.id,
          currentISTDate.toISOString().split('T')[0]
        );

        setIsHoliday(isHoliday || false);
      };

      fetchAttendanceData();
    }
  }, [currentInternship, studentData, user, currentISTDate]);

  const isProfileIncomplete =
    studentData &&
    (!studentData.dob ||
      !studentData.address ||
      !studentData.admission_year ||
      !studentData.division ||
      !studentData.roll_no ||
      !studentData.admission_id);

  const upcomingInternship = studentInternships?.find(
    (internship) => new Date(internship.start_date) > new Date()
  );

  if (!studentData) {
    return (
      <div className="h-60 flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="@container">
      <div className="pb-5">
        <h1 className="text-2xl font-semibold">
          Hello, {studentData?.users?.name} 👋
        </h1>
        <p className="text-gray-700 dark:text-gray-300 py-2">
          Welcome to your dashboard. Here you can view your internships, profile
          and more.
        </p>
      </div>
      {isProfileIncomplete && <CompleteProfileCard />}
      {studentInternships && studentInternships.length === 0 && (
        <AddInternshipCard />
      )}
      {upcomingInternship && studentInternships?.length === 1 && (
        <UpcomingInternshipCard internship={upcomingInternship} />
      )}
      {currentInternship && (
        <div className="grid md:grid-cols-[320px_auto] gap-5">
          <div className="flex gap-5 flex-wrap min-[690px]:flex-nowrap md:flex-wrap w-full">
            {isLoadingAttendance ? (
              <Card className="flex flex-col flex-grow min-w-[320px] w-1/2">
                <CardContent className="flex flex-col flex-grow gap-5 justify-between pt-6">
                  <CardTitle className="text-center">Mark Attendance</CardTitle>
                  <div className="h-full min-h-40 flex flex-col justify-center items-center gap-4">
                    <Skeleton className="w-3/4 h-6" />
                    <Skeleton className="w-3/4 h-6" />
                    <Skeleton className="w-1/2 h-5 rounded-full" />
                    <Skeleton className="w-full h-10" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MarkAttendanceCard
                attendance={attendanceData}
                internshipMode={currentInternship.mode}
                isHolidayToday={isHoliday}
                onCheckIn={markCheckInAndModeAttendance}
                onCheckOut={markCheckOutAttendance}
              />
            )}
            <div className="flex-grow min-[690px]:flex-grow-0 md:flex-grow">
              <CurrentAttendanceChart
                totalWorkingDays={totalWorkingDays}
                totalPresentDays={totalPresentDays}
              />
            </div>
          </div>
          {isLoadingReport || isLoadingAttendance ? (
            <Card className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle>Submit Report</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow gap-5">
                <Skeleton className="w-full flex-grow" />
                <Skeleton className="w-24 h-10" />
              </CardContent>
            </Card>
          ) : (
            // <SubmitReportCard
            //   report={reportData}
            //   attendance={attendanceData}
            //   isHolidayToday={isHoliday}
            //   onSubmitReport={addDailyReport}
            // />
            <div className="rounded-xl border-2 bg-card text-card-foreground shadow-sm flex-grow min-h-60">
              Submit Report Card
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboardPage;
